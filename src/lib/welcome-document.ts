/** Shared by project creation and Reset; keep this welcome sheet to one A4 page. */
export const WELCOME_LATEX_CONTENT = String.raw`\documentclass[10pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{amsmath,amssymb,booktabs,circuitikz,xcolor}
\usepackage[margin=0.75in]{geometry}
\usepackage{hyperref}
\definecolor{sage}{HTML}{245C47}
\definecolor{muted}{HTML}{59675E}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{6pt}
\begin{document}
\begin{minipage}[c]{0.12\textwidth}
\begin{tikzpicture}[scale=.55]
\fill[sage,rounded corners=5pt] (0,0) rectangle (1.6,1.6);
\draw[white,line width=1.2pt] (.48,.3)--(.36,.3)--(.36,.64)--(.24,.8)--(.36,.96)--(.36,1.3)--(.48,1.3);
\draw[white,line width=1.2pt] (1.12,.3)--(1.24,.3)--(1.24,.64)--(1.36,.8)--(1.24,.96)--(1.24,1.3)--(1.12,1.3);
\fill[white] (.8,.25)--(.53,.78)--(.8,1.34)--(1.07,.78)--cycle;
\draw[sage,line width=1pt] (.8,.25)--(.8,.78);
\fill[sage] (.8,.86) circle (.07);
\end{tikzpicture}
\end{minipage}\hfill
\begin{minipage}[c]{0.85\textwidth}
{\Huge\bfseries\color{sage} TeXStudio Local}\\[5pt]
{\large A space for better papers.}\\[3pt]
{\small\color{muted} Write locally. Typeset beautifully. Keep your work yours.}
\end{minipage}
\vspace{12pt}\hrule\vspace{8pt}
\section*{Welcome to your workspace}
Start with this document, create a project, or choose a template. Edit the source on the left,
then press \textbf{Ctrl + Enter} to see your PDF on the right.

\vspace{6pt}
\begin{minipage}[t]{0.46\textwidth}
\section*{A few useful shortcuts}
\small
\begin{tabular}{@{}ll@{}}
\toprule
\textbf{Shortcut} & \textbf{Action}\\\midrule
Ctrl + Enter & Compile document\\
Ctrl + B & Toggle file sidebar\\
Ctrl + F / H & Find and replace\\
Ctrl + Space & Complete a command\\
Ctrl + Click PDF & Jump to source\\\bottomrule
\end{tabular}
\end{minipage}\hfill
\begin{minipage}[t]{0.49\textwidth}
\section*{Tools within reach}
\small
\textbf{01\quad Multi-engine typesetting}\\
pdfLaTeX, XeLaTeX, LuaLaTeX and bibliography passes.\\[3pt]
\textbf{02\quad TeX Sage}\\
Ask your configured AI provider for writing or LaTeX help.\\[3pt]
\textbf{03\quad Tables and symbols}\\
Build a table or insert mathematical notation.\\[3pt]
\textbf{04\quad Snapshots}\\
Save a named checkpoint before a big revision.\\[3pt]
\textbf{05\quad Export}\\
Download your PDF or the complete project ZIP.
\end{minipage}

\vspace{14pt}
\begin{minipage}[t]{0.46\textwidth}
\section*{A little mathematics}
Clean notation, ready for your next idea:
\[
\mathcal{L}(x,\lambda)=f_0(x)+\sum_{i=1}^{m}\lambda_i f_i(x).
\]
\small Try changing a symbol and compiling again.
\end{minipage}\hfill
\begin{minipage}[t]{0.49\textwidth}
\section*{A little engineering}
\centering
\begin{circuitikz}[american,scale=.75,transform shape]
\draw (0,0) to[V,v=$V_{\mathrm{in}}$] (0,2)
 to[R,l=$R$] (3,2) to[C,l=$C$] (3,0)--(0,0);
\end{circuitikz}
\end{minipage}
\vfill
\hrule\vspace{8pt}
{\color{sage}\large\bfseries Make room for your next idea.}\hfill{\small Edit this page to begin.}
\end{document}
`;

export const WELCOME_BIB_CONTENT = String.raw`@article{texstudio2026,
  author = {TeXStudio Contributors},
  title = {A Sample Bibliography Entry},
  journal = {Example Journal},
  year = {2026}
}
`;
