import * as xhr from './xhr';
import PuzzleCtrl from './ctrl';
import { ThemeKey } from './interfaces';
import { winningChances } from 'ceval';
import * as licon from 'common/licon';
import { StoredProp, storedIntProp } from 'common/storage';
import { domDialog } from 'common/dialog';

export default class Report {
  // if local eval suspect multiple solutions, report the puzzle, once at most
  reported: boolean = false;
  // timestamp (ms) of the last time the user clicked on the hide report dialog toggle
  tsHideReportDialog: StoredProp<number>;

  constructor(readonly ctrl: PuzzleCtrl) {
    this.tsHideReportDialog = storedIntProp('puzzle.report.hide.ts', 0);
  }

  // (?)take the eval as arg instead of taking it from the node to be sure it's the most up to date
  // All non-mates puzzle should have one and only one solution, if that is not the case, report it back to backend
  checkForMultipleSolutions(ev: Tree.ClientEval): void {
    // first, make sure we're in view mode so we know the solution is the mainline
    // do not check, checkmate puzzles
    if (
      !this.ctrl.session.userId ||
      this.reported ||
      this.ctrl.mode != 'view' ||
      this.ctrl.threatMode() ||
      // the `mate` key theme is not sent, as it is considered redubant with `mateInX`
      this.ctrl.data.puzzle.themes.some((t: ThemeKey) => t.toLowerCase().includes('mate')) ||
      // if the user has chosen to hide the dialog less than a week ago
      this.tsHideReportDialog() > Date.now() - 1000 * 3600 * 24 * 7
    )
      return;
    const node = this.ctrl.node;
    // more resilient than checking the turn directly, if eventually puzzles get generated from 'from position' games
    const nodeTurn = node.fen.includes(' w ') ? 'white' : 'black';
    if (
      node.ply >= this.ctrl.initialNode.ply &&
      nodeTurn == this.ctrl.pov &&
      this.ctrl.mainline.some((n: Tree.Node) => n.id == node.id)
    ) {
      const [bestEval, secondBestEval] = [ev.pvs[0], ev.pvs[1]];
      // stricly identical to lichess-puzzler v49 check
      if (
        (ev.depth > 50 || ev.nodes > 25_000_000) &&
        bestEval &&
        secondBestEval &&
        winningChances.povDiff(this.ctrl.pov, bestEval, secondBestEval) < 0.35
      ) {
        // in all case, we do not want to show the dialog more than once
        console.log('ev', ev);
        this.reported = true;
        const reason = `after move ${node.ply}${node.san}, at depth ${ev.depth}, they're multiple solutions, pvs ${ev.pvs.map(pv => `${pv.moves[0]}: ${pv.cp}`).join(', ')}`;
        this.reportDialog(reason);
      }
    }
  }

  private reportDialog = (reason: string) => {
    const switchButton =
      `<div class="switch switch-report-puzzle" title="temporarily disable reporting puzzles">` +
      `<input id="puzzle-toggle-report" class="cmn-toggle cmn-toggle--subtle" type="checkbox">` +
      `<label for="analyse-toggle-report"></label></div>`;

    const hideDialogInput = () => document.querySelector('.switch-report-puzzle input') as HTMLInputElement;

    domDialog({
      htmlText:
        '<div><strong style="font-size:1.5em">' +
        'Report multiple solutions' +
        '</strong><br /><br />' +
        '<p>' +
        'You have found a puzzle with multiple solutions, report it?' +
        '</p><br />' +
        switchButton +
        '<span>Hide this for a week</span>' +
        '<br /><br />' +
        `<button type="reset" class="button button-empty button-red text reset" data-icon="${licon.X}">No</button>` +
        `<button type="submit" class="button button-green text apply" data-icon="${licon.Checkmark}">Yes</button>`,
    }).then(dlg => {
      $('.switch-report-puzzle label', dlg.view).on('click', () => {
        const input = hideDialogInput();
        input.checked = !input.checked;
      });
      $('.reset', dlg.view).on('click', () => {
        if (hideDialogInput().checked) {
          this.tsHideReportDialog(Date.now());
        }

        dlg.close();
      });
      $('.apply', dlg.view).on('click', () => {
        console.log('clicked apply');
        xhr.report(this.ctrl.data.puzzle.id, reason);
        dlg.close();
      });
      dlg.showModal();
    });
  };
}
