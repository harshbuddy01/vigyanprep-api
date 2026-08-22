import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads/diagrams directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const DIAGRAMS_DIR = path.join(UPLOADS_DIR, 'diagrams');

if (!fs.existsSync(DIAGRAMS_DIR)) {
  fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });
}

// Starter TikZ Templates for Science Teachers
export const TIKZ_TEMPLATES = {
  incline_mechanics: {
    name: 'Physics: Incline Wedge & Block',
    code: `\\begin{tikzpicture}[scale=1.1, >=stealth]
  % Ground
  \\draw[thick] (-0.5, 0) -- (6.5, 0);
  \\fill[pattern=north east lines, pattern color=gray!60] (-0.5, -0.2) rectangle (6.5, 0);

  % Incline Wedge
  \\draw[ultra thick, fill=amber!15] (0,0) -- (5,0) -- (5, 2.886) -- cycle;
  \\node at (2.8, 0.6) {\\bfseries Wedge ($M$)};
  \\draw (0.8, 0) arc (0:30:0.8);
  \\node at (1.2, 0.25) {$30^\\circ$};

  % Block on incline
  \\begin{scope}[shift={(2.0, 1.155)}, rotate=30]
    \\draw[thick, fill=blue!20] (0,0) rectangle (1.8, 0.9);
    \\node at (0.9, 0.45) {\\bfseries $m$};
    \\draw[->, ultra thick, red] (1.8, 0.45) -- (3.0, 0.45) node[right] {$\\vec{F}$};
  \\end{scope}
\\end{tikzpicture}`
  },

  spring_pulley: {
    name: 'Physics: Pulley & Spring System',
    code: `\\begin{tikzpicture}[scale=1.0, >=stealth]
  % Ceiling
  \\fill[pattern=north east lines, pattern color=gray] (-1, 3.5) rectangle (3, 3.8);
  \\draw[thick] (-1, 3.5) -- (3, 3.5);

  % Pulley
  \\draw[thick, fill=gray!30] (1, 2.7) circle (0.4);
  \\draw[thick] (1, 3.5) -- (1, 2.7);

  % Spring
  \\draw[thick, decoration={aspect=0.5, segment length=3mm, amplitude=3mm, coil}, decorate] (0.6, 2.7) -- (0.6, 1.2);
  \\draw[thick, fill=emerald!20] (0.2, 0.5) rectangle (1.0, 1.2);
  \\node at (0.6, 0.85) {$m_1$};

  % Mass 2 on string
  \\draw[thick] (1.4, 2.7) -- (1.4, 1.0);
  \\draw[thick, fill=purple!20] (1.0, 0.3) rectangle (1.8, 1.0);
  \\node at (1.4, 0.65) {$m_2$};
\\end{tikzpicture}`
  },

  circuit_diagram: {
    name: 'Physics: AC / RLC Circuit',
    code: `\\begin{tikzpicture}[scale=1.0]
  % Circuit loop
  \\draw[thick] (0,0) -- (0,2) -- (1.5,2);
  \\draw[thick, fill=amber!20] (1.5,1.7) rectangle (2.7,2.3) node[pos=0.5] {$R = 10\\,\\Omega$};
  \\draw[thick] (2.7,2) -- (4,2) -- (4,0);
  
  % Capacitor
  \\draw[thick] (4,0) -- (2.3,0);
  \\draw[very thick] (2.3,-0.4) -- (2.3,0.4);
  \\draw[very thick] (1.9,-0.4) -- (1.9,0.4);
  \\node at (2.1, 0.7) {$C = 5\\,\\mu\\text{F}$};
  \\draw[thick] (1.9,0) -- (0,0);

  % Voltage Source
  \\draw[thick, fill=white] (0,1) circle (0.35);
  \\node at (0,1) {$\\sim$};
  \\node[left] at (-0.4, 1) {$V(t) = V_0 \\sin(\\omega t)$};
\\end{tikzpicture}`
  },

  benzene_chemistry: {
    name: 'Chemistry: Organic Reaction / Benzene',
    code: `\\begin{tikzpicture}[scale=1.1, thick]
  % Benzene Ring
  \\draw (0:1) -- (60:1) -- (120:1) -- (180:1) -- (240:1) -- (300:1) -- cycle;
  \\draw (0,0) circle (0.65);
  
  % Nitro group
  \\draw (60:1) -- (60:1.7) node[above right] {$\\text{NO}_2$};
  % Methyl group
  \\draw (240:1) -- (240:1.7) node[below left] {$\\text{CH}_3$};

  % Reaction Arrow
  \\draw[->, line width=1.5pt] (2.0, 0) -- (4.2, 0) node[midway, above] {$\\text{Sn} / \\text{HCl}$} node[midway, below] {$\\Delta$};

  % Product Ring
  \\begin{scope}[shift={(6.0, 0)}]
    \\draw (0:1) -- (60:1) -- (120:1) -- (180:1) -- (240:1) -- (300:1) -- cycle;
    \\draw (0,0) circle (0.65);
    \\draw (60:1) -- (60:1.7) node[above right] {$\\text{NH}_2$};
    \\draw (240:1) -- (240:1.7) node[below left] {$\\text{CH}_3$};
  \\end{scope}
\\end{tikzpicture}`
  },

  coordinate_math: {
    name: 'Mathematics: Coordinate Graph & Parabola',
    code: `\\begin{tikzpicture}[scale=0.9, >=stealth]
  % Axes
  \\draw[->, thick] (-3,0) -- (3.5,0) node[right] {$x$};
  \\draw[->, thick] (0,-1) -- (0,3.5) node[above] {$y$};
  \\node[below left] at (0,0) {$O$};

  % Parabola
  \\draw[domain=-2:2, smooth, variable=\\x, ultra thick, blue!80] plot ({\\x}, {\\x*\\x - 0.5});
  \\node[above right, blue] at (1.8, 3.0) {$y = f(x)$};

  % Tangent line
  \\draw[thick, dashed, red!80] (-2, -1.5) -- (2, 2.5) node[right] {Tangent at $P(1, 0.5)$};
  \\fill[red] (1, 0.5) circle (2pt) node[below right] {$P$};
\\end{tikzpicture}`
  }
};

/**
 * Smart LaTeX parser: separates preambles, \usepackage, \usetikzlibrary, and wraps cleanly
 */
function wrapTikzInDocument(rawCode) {
  const trimmed = rawCode.trim();

  // If full document already provided
  if (trimmed.includes('\\documentclass')) {
    return trimmed;
  }

  // Separate preamble commands from body commands
  const lines = trimmed.split('\n');
  const userPreamble = [];
  const bodyLines = [];

  let insideDocument = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('\\begin{document}')) {
      insideDocument = true;
      continue;
    }
    if (trimmedLine.startsWith('\\end{document}')) {
      insideDocument = false;
      continue;
    }

    if (!insideDocument && (
      trimmedLine.startsWith('\\usepackage') ||
      trimmedLine.startsWith('\\usetikzlibrary') ||
      trimmedLine.startsWith('\\tikzset') ||
      trimmedLine.startsWith('\\newcommand') ||
      trimmedLine.startsWith('\\renewcommand') ||
      trimmedLine.startsWith('\\def') ||
      trimmedLine.startsWith('\\pgfplotsset')
    )) {
      userPreamble.push(trimmedLine);
    } else {
      bodyLines.push(line);
    }
  }

  const customPreamble = userPreamble.join('\n');
  const cleanBody = bodyLines.join('\n').trim();

  return `\\documentclass[tikz,border=6pt,xcolor={dvipsnames,svgnames,x11names}]{standalone}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsfonts}
\\usepackage{tikz}
\\usepackage{xcolor}
\\definecolor{amber}{RGB}{245,158,11}
\\definecolor{emerald}{RGB}{16,185,129}
\\definecolor{indigo}{RGB}{99,102,241}
\\definecolor{crimson}{RGB}{220,20,60}
\\definecolor{purple}{RGB}{168,85,247}
\\definecolor{rose}{RGB}{244,63,94}
\\definecolor{teal}{RGB}{20,184,166}
\\definecolor{sky}{RGB}{14,165,233}
\\usetikzlibrary{arrows.meta,patterns,patterns.meta,calc,decorations.pathmorphing,decorations.markings,shapes,shapes.geometric,positioning,angles,quotes,intersections,3d}
${customPreamble}

\\begin{document}
${cleanBody}
\\end{document}`;
}

export async function renderTikz(req, res) {
  try {
    const { tikzCode, dpi = 300 } = req.body;

    if (!tikzCode || typeof tikzCode !== 'string' || !tikzCode.trim()) {
      return res.status(400).json({ success: false, error: 'tikzCode is required' });
    }

    const fullDocument = wrapTikzInDocument(tikzCode);
    const hash = crypto.createHash('sha256').update(fullDocument + '_' + dpi).digest('hex').slice(0, 16);
    const outputFilename = `tikz_${hash}.png`;
    const finalImagePath = path.join(DIAGRAMS_DIR, outputFilename);

    // Check if already compiled and cached on disk
    if (fs.existsSync(finalImagePath)) {
      const stats = fs.statSync(finalImagePath);
      const relativeUrl = `/uploads/diagrams/${outputFilename}`;
      return res.json({
        success: true,
        cached: true,
        sizeBytes: stats.size,
        imageUrl: relativeUrl,
        filename: outputFilename
      });
    }

    // Create temporary build folder
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tikz_build_'));
    const texPath = path.join(tmpDir, 'document.tex');
    const pdfPath = path.join(tmpDir, 'document.pdf');
    const pngPath = path.join(tmpDir, 'document.png');

    try {
      fs.writeFileSync(texPath, fullDocument, 'utf8');

      // 1. Run pdflatex
      const pdflatexBin = fs.existsSync('/usr/bin/pdflatex')
        ? '/usr/bin/pdflatex'
        : (fs.existsSync('/Library/TeX/texbin/pdflatex') ? '/Library/TeX/texbin/pdflatex' : 'pdflatex');

      try {
        await execFileAsync(pdflatexBin, [
          '-interaction=nonstopmode',
          '-halt-on-error',
          '-output-directory', tmpDir,
          texPath
        ], { timeout: 15000 });
      } catch (latexErr) {
        // Read log file to give the teacher a crystal clear error message
        const logPath = path.join(tmpDir, 'document.log');
        let errorSnippet = 'LaTeX compilation error';
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8');
          const lines = logContent.split('\n');
          const importantErrors = [];
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('!') || lines[i].includes('Error:')) {
              importantErrors.push(lines[i]);
              if (lines[i + 1] && lines[i + 1].trim()) importantErrors.push(lines[i + 1].trim());
            }
          }
          if (importantErrors.length > 0) {
            errorSnippet = importantErrors.slice(0, 3).join(' \n ');
          }
        }
        return res.status(422).json({
          success: false,
          error: errorSnippet,
          details: latexErr.message
        });
      }

      if (!fs.existsSync(pdfPath)) {
        return res.status(500).json({ success: false, error: 'PDF compilation produced no output file' });
      }

      // 2. Convert PDF to 300 DPI Transparent PNG using Ghostscript or sips
      const gsBin = fs.existsSync('/usr/bin/gs')
        ? '/usr/bin/gs'
        : (fs.existsSync('/usr/local/bin/gs') ? '/usr/local/bin/gs' : 'gs');

      try {
        await execFileAsync(gsBin, [
          '-dSAFER',
          '-dBATCH',
          '-dNOPAUSE',
          `-r${dpi}`,
          '-sDEVICE=pngalpha',
          `-sOutputFile=${pngPath}`,
          pdfPath
        ], { timeout: 10000 });
      } catch {
        // Fallback to macOS sips if available
        if (fs.existsSync('/usr/bin/sips')) {
          await execFileAsync('/usr/bin/sips', ['-s', 'format', 'png', pdfPath, '--out', pngPath], { timeout: 10000 });
        }
      }

      if (!fs.existsSync(pngPath)) {
        return res.status(500).json({ success: false, error: 'Image conversion failed' });
      }

      // Move generated PNG to permanent uploads/diagrams directory
      fs.copyFileSync(pngPath, finalImagePath);
      const stats = fs.statSync(finalImagePath);
      const relativeUrl = `/uploads/diagrams/${outputFilename}`;

      return res.json({
        success: true,
        cached: false,
        sizeBytes: stats.size,
        imageUrl: relativeUrl,
        filename: outputFilename
      });
    } finally {
      // Clean up temp build folder
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (cleanErr) {
        console.warn('Failed to clean temp build dir:', cleanErr);
      }
    }
  } catch (err) {
    console.error('TikZ compiler error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error compiling diagram' });
  }
}

/**
 * POST /api/admin/diagrams/upload
 * Handles direct screenshot / file upload (base64)
 */
export async function uploadDiagram(req, res) {
  try {
    const { base64Data, filename } = req.body;

    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ success: false, error: 'base64Data is required' });
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\\/]+);base64,(.+)$/);
    const buffer = matches
      ? Buffer.from(matches[2], 'base64')
      : Buffer.from(base64Data, 'base64');

    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
    const ext = filename ? path.extname(filename).toLowerCase() || '.png' : '.png';
    const outputFilename = `upload_${hash}${ext}`;
    const finalPath = path.join(DIAGRAMS_DIR, outputFilename);

    fs.writeFileSync(finalPath, buffer);
    const stats = fs.statSync(finalPath);
    const relativeUrl = `/uploads/diagrams/${outputFilename}`;

    return res.json({
      success: true,
      sizeBytes: stats.size,
      imageUrl: relativeUrl,
      filename: outputFilename
    });
  } catch (err) {
    console.error('Upload diagram error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to upload image' });
  }
}

/**
 * GET /api/admin/diagrams/templates
 * Returns pre-built science diagram templates
 */
export async function getTemplates(_req, res) {
  return res.json({
    success: true,
    templates: TIKZ_TEMPLATES
  });
}
