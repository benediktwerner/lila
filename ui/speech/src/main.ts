interface Howl {
  _duration: number;
  stop(): void;
}

const soundNames = [
  'longCastle',
  'shortCastle',
  'takes',
  'check',
  'checkmate',
  'promote',
  'at',
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  'pawn',
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
];

type SoundName = typeof soundNames[number];

let playing: SoundName | undefined;
let queue: SoundName[] = [];

const sounds: Record<SoundName, Howl> = soundNames.reduce((o, sound) => {
  o[sound] = new window.Howl({
    src: ['ogg', 'mp3'].map(ext => `${lichess.sound.baseUrl}/voice/${sound}.${ext}`),
  });
  return o;
}, {} as Record<SoundName, Howl>);

function play(sound: SoundName) {
  queue.push(sound);
  if (!playing) playNext();
}

function playNext() {
  playing = queue.splice(0, 1)[0];
  if (playing) {
    const howl = sounds[playing];
    lichess.sound.playHowl(howl);
    setTimeout(() => playNext(), howl._duration * 1000);
  }
}

function isCoord(c: string): c is SoundName {
  const code = c.charCodeAt(0);
  return (code > 48 && code < 58) || (code > 96 && code < 105);
}

function renderSan(san: San, cut?: boolean) {
  if (cut) {
    if (playing) sounds[playing].stop();
    playing = undefined;
    queue = [];
  }

  if (san.startsWith('O-O')) {
    if (san.startsWith('O-O-O')) play('longCastle');
    else play('shortCastle');
    if (san.endsWith('+')) play('check');
    else if (san.endsWith('#')) play('checkmate');
  } else
    san.split('').forEach(c => {
      // prettier-ignore
      switch (c) {
        case 'x': return play('takes');
        case '+': return play('check');
        case '#': return play('checkmate');
        case '=': return play('promote');
        case '@': return play('at');
        case 'P': return play('pawn');
        case 'R': return play('rook');
        case 'N': return play('knight');
        case 'B': return play('bishop');
        case 'Q': return play('queen');
        case 'K': return play('king');
        default: if (isCoord(c)) play(c);
      }
    });
}

export function step(s: { san?: San }, cut?: boolean) {
  if (s.san) renderSan(s.san, cut);
  else lichess.sound.say('Game start', cut);
}
