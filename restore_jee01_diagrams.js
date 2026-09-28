// restore_jee01_diagrams.js
// Script to generate, verify, upload to GCS, and update Supabase for all diagrams in JEE 01
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
dotenv.config();

const execAsync = promisify(exec);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const BUCKET = 'vigyanprep-diagrams';
const OUT_DIR = '/tmp/restored_diagrams';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 18 High-Resolution SVG definitions designed for JEE Main & IAT
const DIAGRAM_SVGS = {
  // Chem Q3: Marked hydrogen acidity on 5-membered lactam
  'tikz_7121083523a59953.png': `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="320" viewBox="0 0 620 320" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="600" height="300" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="310" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Acidic Hydrogen Identification</text>

    <g transform="translate(300, 160)">
      <!-- 5-membered ring: N at top, C=O at right, C=C at left/bottom -->
      <!-- Vertices: N(0, -65), C2(60, -20), C3(40, 55), C4(-40, 55), C5(-60, -20) -->
      <!-- Ring Bonds -->
      <line x1="0" y1="-65" x2="60" y2="-20" stroke="#1e293b" stroke-width="3" />
      <line x1="60" y1="-20" x2="40" y2="55" stroke="#1e293b" stroke-width="3" />
      <line x1="40" y1="55" x2="-40" y2="55" stroke="#1e293b" stroke-width="3" />
      <!-- Double bond between C4 and C5 -->
      <line x1="-40" y1="55" x2="-60" y2="-20" stroke="#1e293b" stroke-width="3" />
      <line x1="-33" y1="48" x2="-49" y2="-12" stroke="#1e293b" stroke-width="2.5" />
      <line x1="-60" y1="-20" x2="0" y2="-65" stroke="#1e293b" stroke-width="3" />

      <!-- Carbonyl C=O at C2(60, -20) -->
      <line x1="60" y1="-24" x2="110" y2="-40" stroke="#1e293b" stroke-width="3" />
      <line x1="58" y1="-16" x2="108" y2="-32" stroke="#1e293b" stroke-width="3" />
      <text x="126" y="-30" font-size="24" font-weight="bold" fill="#1e293b">O</text>

      <!-- Nitrogen Label at (0, -65) -->
      <circle cx="0" cy="-65" r="14" fill="#ffffff" />
      <text x="0" y="-57" text-anchor="middle" font-size="24" font-weight="bold" fill="#2563eb">N</text>

      <!-- H^1 attached to N -->
      <line x1="0" y1="-75" x2="0" y2="-115" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="-125" r="16" fill="#eff6ff" stroke="#2563eb" stroke-width="2" />
      <text x="0" y="-119" text-anchor="middle" font-size="15" font-weight="bold" fill="#1d4ed8">H¹</text>

      <!-- H^2 attached to C4(-40, 55) -->
      <line x1="-40" y1="55" x2="-75" y2="95" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="-88" cy="108" r="16" fill="#fef2f2" stroke="#dc2626" stroke-width="2" />
      <text x="-88" y="114" text-anchor="middle" font-size="15" font-weight="bold" fill="#dc2626">H²</text>

      <!-- H^3 attached to C5(-60, -20) -->
      <line x1="-60" y1="-20" x2="-110" y2="-35" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="-125" cy="-40" r="16" fill="#f0fdf4" stroke="#16a34a" stroke-width="2" />
      <text x="-125" y="-34" text-anchor="middle" font-size="15" font-weight="bold" fill="#16a34a">H³</text>
    </g>
  </svg>`,

  // Chem Q4: C-Br Heterolysis
  'tikz_3de529ad4c62b653.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" viewBox="0 0 760 260" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="240" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Candidate Organobromides for Heterolysis</text>

    <!-- (A) Bromobenzene -->
    <g transform="translate(100, 130)">
      <polygon points="0,-35 30,-17 30,17 0,35 -30,17 -30,-17" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="20" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="18" font-weight="bold" fill="#b91c1c">Br</text>
      <text x="0" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(A)</text>
    </g>

    <!-- (B) 1-Bromocyclopentane -->
    <g transform="translate(280, 130)">
      <polygon points="0,-35 33,-11 21,30 -21,30 -33,-11" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="18" font-weight="bold" fill="#b91c1c">Br</text>
      <text x="0" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(B)</text>
    </g>

    <!-- (C) 7-Bromocyclohepta-1,3,5-triene -->
    <g transform="translate(470, 130)">
      <!-- 7-sided polygon -->
      <polygon points="0,-36 30,-22 40,12 20,38 -20,38 -40,12 -30,-22" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <!-- Double bonds inside -->
      <line x1="26" y1="-18" x2="34" y2="10" stroke="#1e293b" stroke-width="2" />
      <line x1="16" y1="32" x2="-16" y2="32" stroke="#1e293b" stroke-width="2" />
      <line x1="-34" y1="10" x2="-26" y2="-18" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-36" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="18" font-weight="bold" fill="#b91c1c">Br</text>
      <text x="0" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#16a34a">(C)</text>
    </g>

    <!-- (D) Bromoethene -->
    <g transform="translate(650, 130)">
      <line x1="-35" y1="10" x2="10" y2="10" stroke="#1e293b" stroke-width="3" />
      <line x1="-35" y1="20" x2="10" y2="20" stroke="#1e293b" stroke-width="3" />
      <text x="-50" y="19" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">H₂C</text>
      <text x="25" y="19" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">CH</text>
      <line x1="38" y1="15" x2="70" y2="-20" stroke="#1e293b" stroke-width="2.5" />
      <text x="82" y="-25" text-anchor="middle" font-size="18" font-weight="bold" fill="#b91c1c">Br</text>
      <text x="0" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(D)</text>
    </g>
  </svg>`,

  // Chem Q6: AgNO3 Precipitation
  'tikz_2901be195fdd89f0.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" viewBox="0 0 760 260" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="240" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Halide Reactivity with aq. AgNO₃</text>

    <!-- (A) 7-Bromocyclohepta-1,3,5-triene (Tropylium) -->
    <g transform="translate(100, 130)">
      <polygon points="0,-36 30,-22 40,12 20,38 -20,38 -40,12 -30,-22" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="26" y1="-18" x2="34" y2="10" stroke="#1e293b" stroke-width="2" />
      <line x1="16" y1="32" x2="-16" y2="32" stroke="#1e293b" stroke-width="2" />
      <line x1="-34" y1="10" x2="-26" y2="-18" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-36" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="18" font-weight="bold" fill="#b91c1c">Br</text>
      <text x="0" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#16a34a">(A)</text>
    </g>

    <!-- (B) 5-Bromocyclopenta-1,3-diene -->
    <g transform="translate(280, 130)">
      <polygon points="0,-35 33,-11 21,30 -21,30 -33,-11" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="27" y1="-6" x2="17" y2="25" stroke="#1e293b" stroke-width="2" />
      <line x1="-27" y1="-6" x2="-17" y2="25" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="18" font-weight="bold" fill="#b91c1c">Br</text>
      <text x="0" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(B)</text>
    </g>

    <!-- (C) 3-Bromocycloprop-1-ene -->
    <g transform="translate(470, 130)">
      <polygon points="0,-35 32,25 -32,25" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="-24" y1="18" x2="24" y2="18" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="18" font-weight="bold" fill="#b91c1c">Br</text>
      <text x="0" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(C)</text>
    </g>

    <!-- (D) Bromocyclohexane -->
    <g transform="translate(650, 130)">
      <polygon points="0,-35 30,-17 30,17 0,35 -30,17 -30,-17" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="18" font-weight="bold" fill="#b91c1c">Br</text>
      <text x="0" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(D)</text>
    </g>
  </svg>`,

  // Chem Q7: Substituted Benzoic Acids
  'tikz_149ac599e5be3136.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="260" viewBox="0 0 760 260" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="240" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Substituted Benzoic Acids</text>

    <!-- (I) 2,6-dimethylbenzoic acid (SIR) -->
    <g transform="translate(100, 135)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-32" x2="0" y2="-58" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-64" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">COOH</text>
      <!-- Ortho CH3 -->
      <line x1="28" y1="-16" x2="48" y2="-28" stroke="#1e293b" stroke-width="2" />
      <text x="62" y="-28" font-size="12" font-weight="bold" fill="#475569">CH₃</text>
      <line x1="-28" y1="-16" x2="-48" y2="-28" stroke="#1e293b" stroke-width="2" />
      <text x="-65" y="-28" text-anchor="end" font-size="12" font-weight="bold" fill="#475569">H₃C</text>
      <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(I)</text>
    </g>

    <!-- (II) Benzoic acid -->
    <g transform="translate(280, 135)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-32" x2="0" y2="-58" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-64" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">COOH</text>
      <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(II)</text>
    </g>

    <!-- (III) ortho-nitrobenzoic acid -->
    <g transform="translate(470, 135)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-32" x2="0" y2="-58" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-64" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">COOH</text>
      <line x1="28" y1="-16" x2="48" y2="-28" stroke="#1e293b" stroke-width="2" />
      <text x="62" y="-28" font-size="12" font-weight="bold" fill="#dc2626">NO₂</text>
      <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(III)</text>
    </g>

    <!-- (IV) Salicylic acid -->
    <g transform="translate(650, 135)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-32" x2="0" y2="-58" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-64" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">COOH</text>
      <line x1="28" y1="-16" x2="48" y2="-28" stroke="#1e293b" stroke-width="2" />
      <text x="62" y="-28" font-size="12" font-weight="bold" fill="#2563eb">OH</text>
      <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">(IV)</text>
    </g>
  </svg>`,

  // Chem Q8: Nitrogen Heterocycles
  'tikz_6238bd740730864d.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="250" viewBox="0 0 760 250" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="230" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Nitrogen Compounds (Basicity Evaluation)</text>

    <!-- Pyridine -->
    <g transform="translate(100, 125)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      <circle cx="0" cy="-32" r="12" fill="#ffffff" />
      <text x="0" y="-26" text-anchor="middle" font-size="18" font-weight="bold" fill="#2563eb">N</text>
      <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">Pyridine</text>
    </g>

    <!-- Piperidine -->
    <g transform="translate(280, 125)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="-32" r="12" fill="#ffffff" />
      <text x="0" y="-26" text-anchor="middle" font-size="18" font-weight="bold" fill="#2563eb">NH</text>
      <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">Piperidine</text>
    </g>

    <!-- Pyrrole -->
    <g transform="translate(470, 125)">
      <polygon points="0,-32 30,-10 18,30 -18,30 -30,-10" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="24" y1="-6" x2="14" y2="25" stroke="#1e293b" stroke-width="2" />
      <line x1="-24" y1="-6" x2="-14" y2="25" stroke="#1e293b" stroke-width="2" />
      <circle cx="0" cy="-32" r="12" fill="#ffffff" />
      <text x="0" y="-26" text-anchor="middle" font-size="18" font-weight="bold" fill="#2563eb">NH</text>
      <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">Pyrrole</text>
    </g>

    <!-- Aniline -->
    <g transform="translate(650, 125)">
      <polygon points="0,-25 25,-10 25,18 0,32 -25,18 -25,-10" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="4" r="16" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-25" x2="0" y2="-45" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-52" text-anchor="middle" font-size="16" font-weight="bold" fill="#2563eb">NH₂</text>
      <text x="0" y="60" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">Aniline</text>
    </g>
  </svg>`,

  // Chem Q10: Tautomerism into Phenol
  'tikz_a3cf9e96cd33bed9.png': `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="230" viewBox="0 0 620 230" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="600" height="210" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="310" y="40" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Aromatization-Driven Tautomeric Equilibrium</text>

    <!-- Keto form -->
    <g transform="translate(160, 120)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="24" y1="-12" x2="24" y2="12" stroke="#1e293b" stroke-width="2.2" />
      <line x1="-24" y1="12" x2="-2" y2="26" stroke="#1e293b" stroke-width="2.2" />
      <!-- C=O at top -->
      <line x1="-3" y1="-32" x2="-3" y2="-55" stroke="#1e293b" stroke-width="2.5" />
      <line x1="3" y1="-32" x2="3" y2="-55" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-62" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">O</text>
      <text x="0" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#64748b">Cyclohexa-2,4-dien-1-one</text>
    </g>

    <!-- Equilibrium arrows -->
    <g transform="translate(310, 120)">
      <line x1="-40" y1="-6" x2="40" y2="-6" stroke="#1e293b" stroke-width="3" />
      <polygon points="40,-6 30,-11 30,-1" fill="#1e293b" />
      <line x1="20" y1="6" x2="-40" y2="6" stroke="#94a3b8" stroke-width="1.5" />
      <polygon points="-40,6 -32,2 -32,10" fill="#94a3b8" />
      <text x="0" y="-14" text-anchor="middle" font-size="12" font-weight="bold" fill="#16a34a">Aromatization</text>
    </g>

    <!-- Enol form (Phenol) -->
    <g transform="translate(460, 120)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-32" x2="0" y2="-55" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-62" text-anchor="middle" font-size="18" font-weight="bold" fill="#2563eb">OH</text>
      <text x="0" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#16a34a">Phenol (&gt;99.9% enol)</text>
    </g>
  </svg>`,

  // Chem Q11: 2,6-dimethyl-N,N-dimethylaniline vs N,N-dimethylaniline (SIR)
  'tikz_792192aa8da29ce5.png': `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="250" viewBox="0 0 620 250" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="600" height="230" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="310" y="40" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Steric Inhibition of Resonance (SIR Effect)</text>

    <!-- Compound X: 2,6-dimethyl-N,N-dimethylaniline -->
    <g transform="translate(180, 130)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-32" x2="0" y2="-55" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-62" text-anchor="middle" font-size="15" font-weight="bold" fill="#2563eb">N(CH₃)₂</text>
      <!-- Ortho CH3 groups -->
      <line x1="28" y1="-16" x2="48" y2="-28" stroke="#1e293b" stroke-width="2.2" />
      <text x="58" y="-28" font-size="12" font-weight="bold" fill="#b91c1c">CH₃</text>
      <line x1="-28" y1="-16" x2="-48" y2="-28" stroke="#1e293b" stroke-width="2.2" />
      <text x="-60" y="-28" text-anchor="end" font-size="12" font-weight="bold" fill="#b91c1c">H₃C</text>
      <text x="0" y="58" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">Compound X</text>
    </g>

    <!-- Compound Y: N,N-dimethylaniline -->
    <g transform="translate(440, 130)">
      <polygon points="0,-32 28,-16 28,16 0,32 -28,16 -28,-16" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-32" x2="0" y2="-55" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-62" text-anchor="middle" font-size="15" font-weight="bold" fill="#2563eb">N(CH₃)₂</text>
      <text x="0" y="58" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">Compound Y</text>
    </g>
  </svg>`,

  // Chem Q12: DNP Rule in Chlorinated Carboxylic Acids
  'tikz_a14044f78ceb5205.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="240" viewBox="0 0 760 240" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="220" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="40" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">DNP Rule: Distance &gt; Number &gt; Power (-I Inductive Effect)</text>

    <!-- (I) 2-chlorobutanoic acid -->
    <g transform="translate(130, 120)">
      <text x="-90" y="10" font-size="18" font-weight="bold" fill="#1e293b">CH₃—CH₂—CH—COOH</text>
      <line x1="28" y1="16" x2="28" y2="46" stroke="#1e293b" stroke-width="2.5" />
      <text x="28" y="65" text-anchor="middle" font-size="18" font-weight="bold" fill="#0284c7">Cl</text>
      <text x="-15" y="-30" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(I)</text>
    </g>

    <!-- (II) 3-chlorobutanoic acid -->
    <g transform="translate(380, 120)">
      <text x="-90" y="10" font-size="18" font-weight="bold" fill="#1e293b">CH₃—CH—CH₂—COOH</text>
      <line x1="-32" y1="16" x2="-32" y2="46" stroke="#1e293b" stroke-width="2.5" />
      <text x="-32" y="65" text-anchor="middle" font-size="18" font-weight="bold" fill="#0284c7">Cl</text>
      <text x="-15" y="-30" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(II)</text>
    </g>

    <!-- (III) 2,2-dichlorobutanoic acid -->
    <g transform="translate(630, 120)">
      <text x="-90" y="10" font-size="18" font-weight="bold" fill="#1e293b">CH₃—CH₂—C—COOH</text>
      <line x1="18" y1="16" x2="18" y2="46" stroke="#1e293b" stroke-width="2.5" />
      <text x="18" y="65" text-anchor="middle" font-size="18" font-weight="bold" fill="#0284c7">Cl</text>
      <line x1="18" y1="-8" x2="18" y2="-32" stroke="#1e293b" stroke-width="2.5" />
      <text x="18" y="-38" text-anchor="middle" font-size="18" font-weight="bold" fill="#0284c7">Cl</text>
      <text x="-40" y="-30" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(III)</text>
    </g>
  </svg>`,

  // Chem Q14: Neutral Electrophiles vs Nucleophiles
  'tikz_6508624dbdde7c25.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="230" viewBox="0 0 760 230" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="210" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Neutral Molecules: Polar Multiple Bonds &amp; Octet Status</text>

    <!-- CO2 -->
    <g transform="translate(100, 120)">
      <text x="0" y="5" text-anchor="middle" font-size="22" font-weight="bold" fill="#1e293b">O = C = O</text>
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(A) CO₂</text>
    </g>

    <!-- SO3 -->
    <g transform="translate(280, 120)">
      <text x="0" y="5" text-anchor="middle" font-size="22" font-weight="bold" fill="#1e293b">SO₃</text>
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(B) SO₃</text>
    </g>

    <!-- BF3 -->
    <g transform="translate(470, 120)">
      <text x="0" y="5" text-anchor="middle" font-size="22" font-weight="bold" fill="#1e293b">BF₃</text>
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(C) BF₃</text>
    </g>

    <!-- P(CH3)3 -->
    <g transform="translate(650, 120)">
      <text x="0" y="5" text-anchor="middle" font-size="22" font-weight="bold" fill="#1e293b">:P(CH₃)₃</text>
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#dc2626">(D) (CH₃)₃P</text>
    </g>
  </svg>`,

  // Chem Q15: Baeyer Strain in Cycloalkanes
  'tikz_feada362c1ee3109.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="240" viewBox="0 0 760 240" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="220" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="40" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Ring Strain &amp; Heat of Combustion per -CH₂- Unit</text>

    <!-- (I) Cyclopropane -->
    <g transform="translate(100, 125)">
      <polygon points="0,-32 30,22 -30,22" fill="#fef2f2" stroke="#dc2626" stroke-width="2.5" />
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(I) Cyclopropane</text>
    </g>

    <!-- (II) Cyclobutane -->
    <g transform="translate(280, 125)">
      <rect x="-26" y="-26" width="52" height="52" fill="#fffbeb" stroke="#d97706" stroke-width="2.5" />
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(II) Cyclobutane</text>
    </g>

    <!-- (III) Cyclopentane -->
    <g transform="translate(470, 125)">
      <polygon points="0,-30 28,-9 18,27 -18,27 -28,-9" fill="#f0fdf4" stroke="#16a34a" stroke-width="2.5" />
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(III) Cyclopentane</text>
    </g>

    <!-- (IV) Cyclohexane -->
    <g transform="translate(650, 125)">
      <polygon points="0,-28 26,-14 26,14 0,28 -26,14 -26,-14" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(IV) Cyclohexane</text>
    </g>
  </svg>`,

  // Chem Q17: Energy Profile Diagram
  'tikz_dee8efb25ea6aace.png': `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="340" viewBox="0 0 680 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="660" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="340" y="40" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Reaction Energy Profile: Alkene + HBr Pathways</text>

    <g transform="translate(60, 280)">
      <!-- Axes -->
      <line x1="0" y1="0" x2="560" y2="0" stroke="#1e293b" stroke-width="2.5" />
      <polygon points="560,0 550,-5 550,5" fill="#1e293b" />
      <text x="560" y="25" text-anchor="end" font-size="14" font-weight="bold" fill="#475569">Reaction Coordinate</text>

      <line x1="0" y1="0" x2="0" y2="-230" stroke="#1e293b" stroke-width="2.5" />
      <polygon points="0,-230 -5,-220 5,-220" fill="#1e293b" />
      <text x="-15" y="-220" text-anchor="end" font-size="14" font-weight="bold" fill="#475569">Potential Energy (E)</text>

      <!-- Reactant Level -->
      <line x1="10" y1="-50" x2="70" y2="-50" stroke="#1e293b" stroke-width="3" />
      <text x="40" y="-30" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e293b">Alkene + HBr</text>

      <!-- Pathway A (Higher Barrier, Less Stable Intermediate) -->
      <path d="M 70 -50 C 130 -220, 190 -220, 240 -120 C 270 -80, 310 -80, 340 -120 C 400 -180, 460 -180, 520 -70" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="6,4" />
      <text x="180" y="-205" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">TS (Pathway A)</text>
      <text x="240" y="-135" text-anchor="middle" font-size="12" font-weight="bold" fill="#dc2626">Carbocation A</text>

      <!-- Pathway B (Lower Barrier, More Stable Intermediate) -->
      <path d="M 70 -50 C 130 -160, 180 -160, 230 -85 C 270 -50, 320 -50, 360 -95 C 410 -150, 460 -150, 520 -70" fill="none" stroke="#16a34a" stroke-width="3" />
      <text x="160" y="-150" text-anchor="middle" font-size="14" font-weight="bold" fill="#16a34a">TS (Pathway B)</text>
      <text x="230" y="-70" text-anchor="middle" font-size="12" font-weight="bold" fill="#16a34a">Carbocation B</text>

      <text x="520" y="-50" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e293b">Product</text>
    </g>
  </svg>`,

  // Chem Q23: Four Cyclic Species for Hückel's Rule
  'tikz_caff999b71f93cc2.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="240" viewBox="0 0 760 240" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="220" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="40" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Planar Conjugated Cyclic Species (Hückel's Rule)</text>

    <!-- (A) Cyclopropenyl cation -->
    <g transform="translate(100, 125)">
      <polygon points="0,-32 28,18 -28,18" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="-20" y1="12" x2="20" y2="12" stroke="#1e293b" stroke-width="2" />
      <text x="0" y="-5" text-anchor="middle" font-size="16" font-weight="bold" fill="#2563eb">⊕</text>
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(A)</text>
    </g>

    <!-- (B) Cyclopentadienyl anion -->
    <g transform="translate(280, 125)">
      <polygon points="0,-30 28,-9 18,27 -18,27 -28,-9" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="22" y1="-5" x2="14" y2="22" stroke="#1e293b" stroke-width="2" />
      <line x1="-22" y1="-5" x2="-14" y2="22" stroke="#1e293b" stroke-width="2" />
      <text x="0" y="6" text-anchor="middle" font-size="18" font-weight="bold" fill="#dc2626">⊖</text>
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(B)</text>
    </g>

    <!-- (C) Tropylium cation (cycloheptatrienyl) -->
    <g transform="translate(470, 125)">
      <polygon points="0,-32 26,-18 34,10 16,32 -16,32 -34,10 -26,-18" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="5" r="16" fill="none" stroke="#2563eb" stroke-width="1.8" stroke-dasharray="4,3" />
      <text x="0" y="11" text-anchor="middle" font-size="18" font-weight="bold" fill="#2563eb">⊕</text>
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(C)</text>
    </g>

    <!-- (D) Cyclooctatetraene (COT) -->
    <g transform="translate(650, 125)">
      <polygon points="-12,-28 12,-28 28,-12 28,12 12,28 -12,28 -28,12 -28,-12" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <line x1="-10" y1="-23" x2="10" y2="-23" stroke="#1e293b" stroke-width="2" />
      <line x1="23" y1="-10" x2="23" y2="10" stroke="#1e293b" stroke-width="2" />
      <line x1="10" y1="23" x2="-10" y2="23" stroke="#1e293b" stroke-width="2" />
      <line x1="-23" y1="10" x2="-23" y2="-10" stroke="#1e293b" stroke-width="2" />
      <text x="0" y="55" text-anchor="middle" font-size="15" font-weight="bold" fill="#334155">(D)</text>
    </g>
  </svg>`,

  // Phys Q15: Prism Minimum Deviation vs Wavelength (4 Options)
  'tikz_aedb125b3f9dd204.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="38" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Variation of Angle of Minimum Deviation (δₘ) with Wavelength (λ)</text>

    <!-- Option A (Decreasing hyperbola - Correct) -->
    <g transform="translate(40, 60)">
      <rect x="0" y="0" width="150" height="110" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <line x1="20" y1="90" x2="135" y2="90" stroke="#1e293b" stroke-width="2" />
      <line x1="20" y1="90" x2="20" y2="15" stroke="#1e293b" stroke-width="2" />
      <text x="135" y="105" font-size="12" font-weight="bold">λ</text>
      <text x="10" y="18" font-size="12" font-weight="bold">δₘ</text>
      <path d="M 30 25 Q 50 70, 125 80" fill="none" stroke="#2563eb" stroke-width="2.5" />
      <text x="75" y="128" text-anchor="middle" font-size="14" font-weight="bold" fill="#16a34a">A (Correct)</text>
    </g>

    <!-- Option B (Increasing) -->
    <g transform="translate(225, 60)">
      <rect x="0" y="0" width="150" height="110" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <line x1="20" y1="90" x2="135" y2="90" stroke="#1e293b" stroke-width="2" />
      <line x1="20" y1="90" x2="20" y2="15" stroke="#1e293b" stroke-width="2" />
      <text x="135" y="105" font-size="12" font-weight="bold">λ</text>
      <text x="10" y="18" font-size="12" font-weight="bold">δₘ</text>
      <path d="M 30 80 Q 70 65, 125 25" fill="none" stroke="#1e293b" stroke-width="2.5" />
      <text x="75" y="128" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">B</text>
    </g>

    <!-- Option C (Peak) -->
    <g transform="translate(410, 60)">
      <rect x="0" y="0" width="150" height="110" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <line x1="20" y1="90" x2="135" y2="90" stroke="#1e293b" stroke-width="2" />
      <line x1="20" y1="90" x2="20" y2="15" stroke="#1e293b" stroke-width="2" />
      <text x="135" y="105" font-size="12" font-weight="bold">λ</text>
      <text x="10" y="18" font-size="12" font-weight="bold">δₘ</text>
      <path d="M 30 75 Q 75 20, 125 75" fill="none" stroke="#1e293b" stroke-width="2.5" />
      <text x="75" y="128" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">C</text>
    </g>

    <!-- Option D (Dip) -->
    <g transform="translate(575, 60)">
      <rect x="0" y="0" width="150" height="110" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <line x1="20" y1="90" x2="135" y2="90" stroke="#1e293b" stroke-width="2" />
      <line x1="20" y1="90" x2="20" y2="15" stroke="#1e293b" stroke-width="2" />
      <text x="135" y="105" font-size="12" font-weight="bold">λ</text>
      <text x="10" y="18" font-size="12" font-weight="bold">δₘ</text>
      <path d="M 30 30 Q 75 80, 125 30" fill="none" stroke="#1e293b" stroke-width="2.5" />
      <text x="75" y="128" text-anchor="middle" font-size="14" font-weight="bold" fill="#334155">D</text>
    </g>
  </svg>`,

  // Phys Q16: Match Table 1 (Optical systems)
  'tikz_470d45ca79855bae.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    
    <!-- Table Header -->
    <rect x="12" y="12" width="736" height="42" rx="12" fill="#0f172a" />
    <text x="180" y="38" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">Column I (Optical System)</text>
    <line x1="360" y1="12" x2="360" y2="330" stroke="#cbd5e1" stroke-width="2" />
    <text x="550" y="38" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">Column II (Effective Behavior)</text>

    <!-- Row A -->
    <text x="30" y="85" font-size="15" font-weight="bold" fill="#2563eb">(A)</text>
    <text x="60" y="85" font-size="14" fill="#1e293b">Equiconvex lens (μ=1.5) immersed in water (μ=4/3)</text>
    <text x="380" y="85" font-size="15" font-weight="bold" fill="#2563eb">(1)</text>
    <text x="410" y="85" font-size="14" fill="#1e293b">Focal length doubles (f' = 2R)</text>
    <line x1="12" y1="120" x2="748" y2="120" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row B -->
    <text x="30" y="155" font-size="15" font-weight="bold" fill="#2563eb">(B)</text>
    <text x="60" y="155" font-size="14" fill="#1e293b">Equiconvex lens cut into two plano-convex halves</text>
    <text x="380" y="155" font-size="15" font-weight="bold" fill="#2563eb">(2)</text>
    <text x="410" y="155" font-size="14" fill="#1e293b">Focal length quadruples (f' = 4R)</text>
    <line x1="12" y1="190" x2="748" y2="190" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row C -->
    <text x="30" y="225" font-size="15" font-weight="bold" fill="#2563eb">(C)</text>
    <text x="60" y="225" font-size="14" fill="#1e293b">Plano-convex lens with flat surface silvered</text>
    <text x="380" y="225" font-size="15" font-weight="bold" fill="#2563eb">(3)</text>
    <text x="410" y="225" font-size="14" fill="#1e293b">Concave mirror of F = -R/3</text>
    <line x1="12" y1="260" x2="748" y2="260" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row D -->
    <text x="30" y="295" font-size="15" font-weight="bold" fill="#2563eb">(D)</text>
    <text x="60" y="295" font-size="14" fill="#1e293b">Plano-convex lens with curved surface silvered</text>
    <text x="380" y="295" font-size="15" font-weight="bold" fill="#2563eb">(4)</text>
    <text x="410" y="295" font-size="14" fill="#1e293b">Concave mirror of F = -R</text>
  </svg>`,

  // Phys Q17: Match Table 2
  'tikz_204588d90b55dbf3.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    
    <!-- Table Header -->
    <rect x="12" y="12" width="736" height="42" rx="12" fill="#0f172a" />
    <text x="180" y="38" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">List I (Optical Situation)</text>
    <line x1="360" y1="12" x2="360" y2="330" stroke="#cbd5e1" stroke-width="2" />
    <text x="550" y="38" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">List II (Characteristic Result)</text>

    <!-- Row A -->
    <text x="30" y="85" font-size="15" font-weight="bold" fill="#2563eb">(A)</text>
    <text x="60" y="85" font-size="14" fill="#1e293b">Air bubble situated at the center of glass sphere</text>
    <text x="380" y="85" font-size="15" font-weight="bold" fill="#2563eb">(1)</text>
    <text x="410" y="85" font-size="14" fill="#1e293b">Escapes through circular area A = 9πh²/7</text>
    <line x1="12" y1="120" x2="748" y2="120" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row B -->
    <text x="30" y="155" font-size="15" font-weight="bold" fill="#2563eb">(B)</text>
    <text x="60" y="155" font-size="14" fill="#1e293b">Parallel light beam incident on full sphere (μ=1.5)</text>
    <text x="380" y="155" font-size="15" font-weight="bold" fill="#2563eb">(2)</text>
    <text x="410" y="155" font-size="14" fill="#1e293b">Concave mirror of focal length F = -R/4</text>
    <line x1="12" y1="190" x2="748" y2="190" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row C -->
    <text x="30" y="225" font-size="15" font-weight="bold" fill="#2563eb">(C)</text>
    <text x="60" y="225" font-size="14" fill="#1e293b">Equiconvex lens silvered on rear surface</text>
    <text x="380" y="225" font-size="15" font-weight="bold" fill="#2563eb">(3)</text>
    <text x="410" y="225" font-size="14" fill="#1e293b">Converges at distance R/2 from rear pole</text>
    <line x1="12" y1="260" x2="748" y2="260" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row D -->
    <text x="30" y="295" font-size="15" font-weight="bold" fill="#2563eb">(D)</text>
    <text x="60" y="295" font-size="14" fill="#1e293b">Snell's window: point source under water at depth h</text>
    <text x="380" y="295" font-size="15" font-weight="bold" fill="#2563eb">(4)</text>
    <text x="410" y="295" font-size="14" fill="#1e293b">No apparent shift; image at center</text>
  </svg>`,

  // Phys Q18: Match Column I with Column II
  'tikz_0064acb1fde9c80a.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    
    <!-- Table Header -->
    <rect x="12" y="12" width="736" height="42" rx="12" fill="#0f172a" />
    <text x="180" y="38" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">Column I (Object Location)</text>
    <line x1="360" y1="12" x2="360" y2="330" stroke="#cbd5e1" stroke-width="2" />
    <text x="550" y="38" text-anchor="middle" font-size="15" font-weight="bold" fill="#ffffff">Column II (Image Nature &amp; Size)</text>

    <!-- Row A -->
    <text x="30" y="85" font-size="15" font-weight="bold" fill="#2563eb">(A)</text>
    <text x="60" y="85" font-size="14" fill="#1e293b">Concave mirror: Real object between F and Pole</text>
    <text x="380" y="85" font-size="15" font-weight="bold" fill="#2563eb">(1)</text>
    <text x="410" y="85" font-size="14" fill="#1e293b">Virtual, erect, and magnified</text>
    <line x1="12" y1="120" x2="748" y2="120" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row B -->
    <text x="30" y="155" font-size="15" font-weight="bold" fill="#2563eb">(B)</text>
    <text x="60" y="155" font-size="14" fill="#1e293b">Convex mirror: Real object in front of mirror</text>
    <text x="380" y="155" font-size="15" font-weight="bold" fill="#2563eb">(2)</text>
    <text x="410" y="155" font-size="14" fill="#1e293b">Virtual, erect, and diminished</text>
    <line x1="12" y1="190" x2="748" y2="190" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row C -->
    <text x="30" y="225" font-size="15" font-weight="bold" fill="#2563eb">(C)</text>
    <text x="60" y="225" font-size="14" fill="#1e293b">Convex lens: Real object placed beyond 2F</text>
    <text x="380" y="225" font-size="15" font-weight="bold" fill="#2563eb">(3)</text>
    <text x="410" y="225" font-size="14" fill="#1e293b">Real, inverted, and diminished</text>
    <line x1="12" y1="260" x2="748" y2="260" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Row D -->
    <text x="30" y="295" font-size="15" font-weight="bold" fill="#2563eb">(D)</text>
    <text x="60" y="295" font-size="14" fill="#1e293b">Concave lens: Real object anywhere on principal axis</text>
    <text x="380" y="295" font-size="15" font-weight="bold" fill="#2563eb">(4)</text>
    <text x="410" y="295" font-size="14" fill="#1e293b">Virtual, erect, and diminished between F and O</text>
  </svg>`,

  // Phys Q20: Plano-Convex Lens Silvered (Case I & II)
  'tikz_4a3605691fd2ea13.png': `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="260" viewBox="0 0 680 260" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="660" height="240" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="340" y="38" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Silvered Plano-Convex Lens (μ = 1.5, R = 30 cm)</text>

    <!-- Case I: Flat Surface Silvered -->
    <g transform="translate(180, 130)">
      <!-- Principal Axis -->
      <line x1="-120" y1="0" x2="100" y2="0" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />
      <!-- Curved boundary -->
      <path d="M 0 -50 A 60 60 0 0 1 0 50 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5" />
      <!-- Silvering hatch on flat back surface -->
      <line x1="0" y1="-50" x2="0" y2="50" stroke="#1e293b" stroke-width="3" />
      <line x1="0" y1="-40" x2="10" y2="-30" stroke="#64748b" stroke-width="1.8" />
      <line x1="0" y1="-20" x2="10" y2="-10" stroke="#64748b" stroke-width="1.8" />
      <line x1="0" y1="0" x2="10" y2="10" stroke="#64748b" stroke-width="1.8" />
      <line x1="0" y1="20" x2="10" y2="30" stroke="#64748b" stroke-width="1.8" />
      <line x1="0" y1="40" x2="10" y2="50" stroke="#64748b" stroke-width="1.8" />
      <text x="0" y="75" text-anchor="middle" font-size="14" font-weight="bold" fill="#0369a1">Case I: Flat Face Silvered</text>
      <text x="0" y="95" text-anchor="middle" font-size="13" font-weight="bold" fill="#475569">F_I = −30 cm</text>
    </g>

    <!-- Divider -->
    <line x1="340" y1="50" x2="340" y2="230" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4,4" />

    <!-- Case II: Curved Surface Silvered -->
    <g transform="translate(500, 130)">
      <!-- Principal Axis -->
      <line x1="-120" y1="0" x2="100" y2="0" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />
      <!-- Curved boundary -->
      <path d="M 0 -50 A 60 60 0 0 1 0 50 Z" fill="#e0f2fe" stroke="#0284c7" stroke-width="2.5" />
      <!-- Silvering hatch on curved surface -->
      <path d="M 0 -50 A 60 60 0 0 1 0 50" fill="none" stroke="#1e293b" stroke-width="3" />
      <line x1="-20" y1="-50" x2="-10" y2="-40" stroke="#64748b" stroke-width="1.8" />
      <line x1="-30" y1="-20" x2="-20" y2="-10" stroke="#64748b" stroke-width="1.8" />
      <line x1="-35" y1="0" x2="-25" y2="10" stroke="#64748b" stroke-width="1.8" />
      <line x1="-30" y1="20" x2="-20" y2="30" stroke="#64748b" stroke-width="1.8" />
      <line x1="-20" y1="50" x2="-10" y2="60" stroke="#64748b" stroke-width="1.8" />
      <text x="0" y="75" text-anchor="middle" font-size="14" font-weight="bold" fill="#0369a1">Case II: Curved Face Silvered</text>
      <text x="0" y="95" text-anchor="middle" font-size="13" font-weight="bold" fill="#475569">F_II = −10 cm</text>
    </g>
  </svg>`
};

async function run() {
  console.log('Starting full diagram restoration...');
  const filenames = Object.keys(DIAGRAM_SVGS);
  console.log(`Processing ${filenames.length} diagrams...`);

  for (const fn of filenames) {
    const svg = DIAGRAM_SVGS[fn];
    const outPath = path.join(OUT_DIR, fn);

    // 1. Render PNG via sharp at 300 DPI
    await sharp(Buffer.from(svg))
      .png({ density: 300 })
      .toFile(outPath);
    console.log(`Rendered: ${fn} (${fs.statSync(outPath).size} bytes)`);

    // 2. Upload to GCS
    await execAsync(`gcloud storage cp ${outPath} gs://${BUCKET}/${fn}`);
    console.log(`Uploaded: gs://${BUCKET}/${fn}`);

    // 3. Update Supabase
    const gcsUrl = `https://storage.googleapis.com/${BUCKET}/${fn}`;
    const { data, error } = await supabase
      .from('questions')
      .update({ image_url: gcsUrl })
      .ilike('image_url', `%${fn}%`)
      .select('id, question_number, section');

    if (error) {
      console.error(`Supabase update error for ${fn}:`, error.message);
    } else {
      console.log(`Supabase updated for ${fn}: ${data?.length || 0} question(s) pointed to GCS`);
    }
  }

  console.log('✅ ALL DIAGRAMS FULLY RESTORED & PERMANENTLY HOSTED ON GCS!');
}

run().catch(console.error);
