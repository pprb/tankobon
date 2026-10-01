import { describe, expect, it } from 'vitest';

import { formatPersonName, guessQueryFromTitle, splitPersonName, splitSeriesTitle } from './title-parsing';

describe('guessQueryFromTitle', () => {
  it.each([
    ['Blacksad_T02_Arctic-Nation (2003)', 'Blacksad', '2'],
    ['Astérix - Tome 03 - Astérix et les Goths', 'Astérix', '3'],
    ['Batman 012 (2016) (Digital) [Zone-Empire]', 'Batman', '12'],
    ['Batman.012.2016', 'Batman', '12'],
    ['X-Men #141', 'X-Men', '141'],
    ['Naruto Vol. 1', 'Naruto', '1'],
    ['One Piece v. n°45', 'One Piece v', '45'],
    ['Saga 12.5', 'Saga', '12.5'],
  ])('reads %j as series %j, volume %j', (title, text, volume) => {
    expect(guessQueryFromTitle(title)).toEqual({ text, volume });
  });

  it('keeps the whole cleaned title when there is no number', () => {
    expect(guessQueryFromTitle('Maus [Integrale] (1986)')).toEqual({ text: 'Maus', volume: null });
  });

  it('ignores a year that is not in brackets', () => {
    expect(guessQueryFromTitle('Watchmen 1986')).toEqual({ text: 'Watchmen 1986', volume: null });
  });

  it('falls back to the text after the number when nothing precedes it', () => {
    expect(guessQueryFromTitle('03 - Le Lotus bleu')).toEqual({ text: 'Le Lotus bleu', volume: '3' });
  });

  it('does not take a word ending in t for a volume marker', () => {
    expect(guessQueryFromTitle('Le Chat 2')).toEqual({ text: 'Le Chat', volume: '2' });
  });
});

describe('splitSeriesTitle', () => {
  it('splits series, volume and title around an explicit marker', () => {
    expect(splitSeriesTitle('Astérix - Tome 3 - Astérix et les Goths')).toEqual({
      series: 'Astérix',
      volume: '3',
      title: 'Astérix et les Goths',
    });
    expect(splitSeriesTitle('Blacksad T02 : Arctic Nation')).toEqual({
      series: 'Blacksad',
      volume: '2',
      title: 'Arctic Nation',
    });
  });

  it('keeps the full text as title when nothing follows the volume', () => {
    expect(splitSeriesTitle('Naruto, Vol. 1')).toEqual({ series: 'Naruto', volume: '1', title: 'Naruto, Vol. 1' });
  });

  it('leaves the series unknown without a marker', () => {
    expect(splitSeriesTitle('Maus')).toEqual({ series: null, volume: null, title: 'Maus' });
  });
});

describe('splitPersonName', () => {
  it('takes the last word as the last name', () => {
    expect(splitPersonName('Stan Lee')).toEqual({ firstName: 'Stan', lastName: 'Lee' });
    expect(splitPersonName('Jean-Claude  Mézières')).toEqual({ firstName: 'Jean-Claude', lastName: 'Mézières' });
  });

  it('keeps particles with the last name', () => {
    expect(splitPersonName('Jean Van Hamme')).toEqual({ firstName: 'Jean', lastName: 'Van Hamme' });
    expect(splitPersonName('Juan Díaz de la Canales')).toEqual({ firstName: 'Juan Díaz', lastName: 'de la Canales' });
  });

  it('treats a single word as a last name', () => {
    expect(splitPersonName('Hergé')).toEqual({ firstName: '', lastName: 'Hergé' });
  });

  it('honours the "Last, First" form', () => {
    expect(splitPersonName('Goscinny, René')).toEqual({ firstName: 'René', lastName: 'Goscinny' });
  });
});

describe('formatPersonName', () => {
  it('joins first and last name, skipping an empty first name', () => {
    expect(formatPersonName({ firstName: 'René', lastName: 'Goscinny' })).toBe('René Goscinny');
    expect(formatPersonName({ firstName: '', lastName: 'Hergé' })).toBe('Hergé');
  });
});
