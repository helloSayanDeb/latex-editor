import { escapeLatexText } from './latex-text';
export function generateTemplate({ docClass, templateId, title, author, fontSize, margin, selectedPackages, sections }: {
  docClass: string; templateId: string; title: string; author: string; fontSize: string; margin: string; selectedPackages: string[]; sections: string;
}): string {
    const isBeamer = docClass === 'beamer';
    const isExam = docClass === 'exam';

    let code = `\\documentclass[${fontSize}, a4paper]{${docClass}}\n`;
    code += `\\usepackage[utf8]{inputenc}\n`;
    if (!isBeamer) code += `\\usepackage[margin=${margin}]{geometry}\n`;

    selectedPackages.filter(pkg => pkg !== 'geometry').forEach(pkg => {
      code += `\\usepackage{${pkg}}\n`;
    });

    code += `\n\\title{\\textbf{${escapeLatexText(title)}}}\n`;
    code += `\\author{${escapeLatexText(author)}}\n`;
    code += `\\date{\\today}\n\n`;

    code += `\\begin{document}\n`;

    if (isBeamer) {
      code += `\\frame{\\titlepage}\n\n`;
      code += `\\begin{frame}{Table of Contents}\n\\tableofcontents\n\\end{frame}\n\n`;
      sections.split(',').forEach(sec => {
        const s = escapeLatexText(sec.trim());
        if (!s) return;
        code += `\\begin{frame}{${s}}\n\\begin{itemize}\n  \\item Point 1 for ${s}\n  \\item Point 2\n\\end{itemize}\n\\end{frame}\n\n`;
      });
    } else if (isExam) {
      code += `\\maketitle\n\n\\begin{questions}\n`;
      code += `\\question[10] Calculate the eigenvalues for the matrix $A$.\n\\vspace{2in}\n`;
      code += `\\question[15] State and prove Bayes' theorem.\n\\vspace{2in}\n`;
      code += `\\end{questions}\n`;
    } else {
      code += `\\maketitle\n\n`;
      code += `\\begin{abstract}\nThis paper presents novel methodologies in high-performance computational systems.\n\\end{abstract}\n\n`;

      if (templateId === 'circuit') {
        code += `\\section{Circuit Design}\n\\begin{center}\n\\begin{circuitikz}[american, scale=1.2]\n  \\draw (0,0) to[V, v=$V_s$] (0,3)\n              to[R, l=$R_1$] (3,3)\n              to[C, l=$C_1$] (3,0) -- (0,0);\n  \\draw (3,3) to[short] (5,3)\n              to[L, l=$L_1$] (5,0) -- (3,0);\n\\end{circuitikz}\n\\end{center}\n\n`;
      }

      sections.split(',').forEach(sec => {
        const s = escapeLatexText(sec.trim());
        if (!s) return;
        code += `\\section{${s}}\nYour content for ${s} goes here.\n\n`;
      });

      code += `% After adding citations, uncomment the bibliography below.\n% \\bibliographystyle{plain}\n% \\bibliography{references}\n`;
    }

    code += `\\end{document}\n`;
    return code;
  }
