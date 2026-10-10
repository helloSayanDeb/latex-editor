import { NextRequest, NextResponse } from 'next/server';
import dictionary from 'dictionary-en';
import nspell from 'nspell';
import { proseWords } from '@/lib/latex-prose';

const spell = nspell(dictionary);
for (const word of ['LaTeX', 'TeX', 'BibTeX', 'TikZ', 'pdfLaTeX', 'XeLaTeX', 'LuaLaTeX']) spell.add(word);
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body.word === 'string' && /^[A-Za-z'’]{1,60}$/.test(body.word)) {
      return NextResponse.json({ suggestions: spell.suggest(body.word).slice(0, 6) });
    }
    if (typeof body.document !== 'string' || body.document.length > 300000) {
      return NextResponse.json({ error: 'Spell checking supports documents up to 300,000 characters.' }, { status: 400 });
    }
    const ignored = new Set(Array.isArray(body.ignored) ? body.ignored.filter((word: unknown) => typeof word === 'string').slice(0, 2000) : []);
    const issues = proseWords(body.document).filter(item => !ignored.has(item.word.toLowerCase()) && !spell.correct(item.word));
    return NextResponse.json({ issues: issues.slice(0, 500), truncated: issues.length > 500 });
  } catch {
    return NextResponse.json({ error: 'Could not check spelling.' }, { status: 500 });
  }
}
