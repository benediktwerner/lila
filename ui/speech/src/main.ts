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
  'promotesTo',
  'at',
  'pawn',
  'rook',
  'knight',
  'bishop',
  'queen',
  'king',
] as const;

type SoundName = typeof soundNames[number] | Files | `${Files}${Ranks}`;

let playing: SoundName | undefined;
let queue: SoundName[] = [];

const sounds: Record<SoundName, Howl> = loadSounds();

function loadSound(sound: SoundName) {
  if (sound.length === 1 || (sound.length === 2 && sound[0] > 'e'))
    return new window.Howl({
      src: ['ogg', 'mp3'].map(ext => `${lichess.sound.baseUrl}/Silence.${ext}`),
    });

  return new window.Howl({
    src: ['ogg', 'mp3'].map(ext => `${lichess.sound.baseUrl}/voice/${sound}.${ext}`),
  });
}

function loadSounds() {
  const sounds = {} as Record<SoundName, Howl>;
  soundNames.forEach(sound => (sounds[sound] = loadSound(sound)));
  for (const letter of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const) {
    sounds[letter] = loadSound(letter);
    for (let num = 1; num <= 8; num++) {
      const sound = (letter + num) as SoundName;
      sounds[sound] = loadSound(sound);
    }
  }
  return sounds;
}

function play(sound: SoundName) {
  queue.push(sound);
  if (!playing) playNext();
}

function playNext() {
  playing = queue.splice(0, 1)[0];
  if (playing) {
    const howl = sounds[playing];
    lichess.sound.playHowl(howl);
    setTimeout(() => playNext(), howl._duration * 1000 - 50);
  }
}

function isCoord(c: string): c is SoundName {
  if (c.length !== 2) return false;
  return isFile(c[0]) && '1' <= c[0] && c[1] <= '8';
}

function isFile(c: string): c is SoundName {
  return 'a' <= c[0] && c[0] <= 'h';
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
    san
      .split('')
      .join(' ')
      .replace(/([a-h]) ([1-8])/, '$1$2')
      .split(' ')
      .forEach(c => {
        // prettier-ignore
        switch (c) {
        case 'x': return play('takes');
        case '+': return play('check');
        case '#': return play('checkmate');
        case '=': return play('promotesTo');
        case '@': return play('at');
        case 'P': return play('pawn');
        case 'R': return play('rook');
        case 'N': return play('knight');
        case 'B': return play('bishop');
        case 'Q': return play('queen');
        case 'K': return play('king');
        default: if (isFile(c) || isCoord(c)) play(c);
      }
      });
}

export function step(s: { san?: San }, cut?: boolean) {
  if (s.san) renderSan(s.san, cut);
  else lichess.sound.say('Game start', cut);
}
