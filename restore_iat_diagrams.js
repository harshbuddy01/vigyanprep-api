// restore_iat_diagrams.js
// Script to generate, verify, upload to GCS, and update Supabase for all remaining 22 diagrams in IAT 02, IAT 03 & Question Bank
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
const OUT_DIR = '/tmp/restored_iat_diagrams';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

export const DIAGRAM_SVGS = {
  // #1: Chem Q4 - Tricyclopropylmethyl cation stability
  'tikz_7012485f7d058343.png': `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="340" viewBox="0 0 700 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="680" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="350" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Tricyclopropylmethyl Cation [(C₃H₅)₃C⁺] - Banana Bond Conjugation</text>
    
    <g transform="translate(350, 180)">
      <!-- Central Carbon -->
      <circle cx="0" cy="0" r="14" fill="#f8fafc" stroke="#2563eb" stroke-width="2" />
      <text x="0" y="7" text-anchor="middle" font-size="20" font-weight="bold" fill="#2563eb">C⁺</text>
      
      <!-- Top Cyclopropyl ring -->
      <line x1="0" y1="-14" x2="0" y2="-50" stroke="#1e293b" stroke-width="3" />
      <polygon points="0,-50 -35,-105 35,-105" fill="#f0f9ff" stroke="#0284c7" stroke-width="2.5" />
      <text x="0" y="-80" text-anchor="middle" font-size="12" font-weight="bold" fill="#0369a1">σ-bent</text>

      <!-- Bottom-Left Cyclopropyl ring -->
      <line x1="-12" y1="8" x2="-45" y2="35" stroke="#1e293b" stroke-width="3" />
      <polygon points="-45,35 -105,35 -75,95" fill="#f0f9ff" stroke="#0284c7" stroke-width="2.5" />
      <text x="-75" y="55" text-anchor="middle" font-size="12" font-weight="bold" fill="#0369a1">σ-bent</text>

      <!-- Bottom-Right Cyclopropyl ring -->
      <line x1="12" y1="8" x2="45" y2="35" stroke="#1e293b" stroke-width="3" />
      <polygon points="45,35 105,35 75,95" fill="#f0f9ff" stroke="#0284c7" stroke-width="2.5" />
      <text x="75" y="55" text-anchor="middle" font-size="12" font-weight="bold" fill="#0369a1">σ-bent</text>

      <!-- Curly arrows showing non-classical resonance -->
      <path d="M -20,-75 C -15,-40 -10,-25 -3,-14" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#arrow)" />
      <text x="0" y="125" text-anchor="middle" font-size="14" fill="#64748b">Maximum thermodynamic stability due to 3-fold bent bond (banana bond) resonance</text>
    </g>
  </svg>`,

  // #2: Phys Q2 - Solid glass sphere with rear silvered surface
  'tikz_b90a05ee6760b7ee.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Optical Focus of Rear-Silvered Glass Sphere (μ = 1.5, Radius R)</text>

    <!-- Principal Axis -->
    <line x1="40" y1="180" x2="720" y2="180" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6,4" />

    <!-- Glass Sphere (Center at 420, 180, Radius 130) -->
    <!-- Front pole P1 at 290, Rear pole P2 at 550, Center C at 420 -->
    <circle cx="420" cy="180" r="130" fill="#f8fafc" stroke="#0284c7" stroke-width="2.5" />

    <!-- Silvering hatch marks on rear hemisphere (x > 420) -->
    <path d="M 420,50 A 130 130 0 0 1 420,310" fill="none" stroke="#475569" stroke-width="6" stroke-dasharray="2,5" />
    <path d="M 420,50 A 130 130 0 0 1 420,310" fill="none" stroke="#64748b" stroke-width="2" />

    <!-- Center point C -->
    <circle cx="420" cy="180" r="4" fill="#0f172a" />
    <text x="420" y="202" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f172a">C</text>

    <!-- Front pole P1 -->
    <circle cx="290" cy="180" r="4" fill="#0f172a" />
    <text x="275" y="202" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f172a">P₁</text>

    <!-- Rear pole P2 -->
    <circle cx="550" cy="180" r="4" fill="#0f172a" />
    <text x="565" y="202" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f172a">P₂ (Silvered)</text>

    <!-- Incident parallel light rays from air (x = 80 to 290) -->
    <!-- Top Ray: y = 130 -->
    <line x1="80" y1="130" x2="300" y2="130" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="190,126 205,130 190,134" fill="#dc2626" />
    
    <!-- Refracted ray inside glass towards rear pole P2(550, 180) -->
    <line x1="300" y1="130" x2="550" y2="180" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="425,152 438,155 430,160" fill="#dc2626" />

    <!-- Bottom Ray: y = 230 -->
    <line x1="80" y1="230" x2="300" y2="230" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="190,226 205,230 190,234" fill="#dc2626" />
    <line x1="300" y1="230" x2="550" y2="180" stroke="#dc2626" stroke-width="2.5" />

    <!-- Labels -->
    <text x="140" y="115" font-size="14" font-weight="bold" fill="#dc2626">Incident Parallel Beam</text>
    <text x="390" y="100" font-size="15" font-weight="bold" fill="#0284c7">Glass (μ = 1.5)</text>
    <text x="500" y="300" font-size="14" font-weight="bold" fill="#059669">Focus at Rear Pole P₂ (Distance = 2R)</text>
  </svg>`,

  // #3: Phys Q4 - Match Table of 4 Optical Systems
  'tikz_57cb058728507c7e.png': `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="780" height="400" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="400" y="40" text-anchor="middle" font-size="17" font-weight="bold" fill="#0f172a">Optical Systems Classification (Curved Refracting &amp; Silvered Media)</text>

    <!-- Table Header -->
    <rect x="30" y="60" width="360" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="210" y="83" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-I (Optical System)</text>
    <rect x="390" y="60" width="380" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="580" y="83" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-II (Focal Property / Focus Location)</text>

    <!-- Row A -->
    <rect x="30" y="95" width="360" height="75" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="135" font-size="14" font-weight="bold" fill="#2563eb">(A)</text>
    <text x="80" y="128" font-size="13" font-weight="bold" fill="#0f172a">Plano-convex lens (μ = 1.5, R)</text>
    <text x="80" y="148" font-size="12" fill="#64748b">silvered at plane curved face</text>
    
    <rect x="390" y="95" width="380" height="75" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="410" y="135" font-size="14" font-weight="bold" fill="#059669">(P)</text>
    <text x="440" y="130" font-size="13" font-weight="bold" fill="#0f172a">Focal length F = -R / (2μ - 2)</text>
    <text x="440" y="150" font-size="12" fill="#64748b">acts as equivalent concave mirror of power P</text>

    <!-- Row B -->
    <rect x="30" y="170" width="360" height="75" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="210" font-size="14" font-weight="bold" fill="#2563eb">(B)</text>
    <text x="80" y="203" font-size="13" font-weight="bold" fill="#0f172a">Solid glass sphere (μ = 1.5)</text>
    <text x="80" y="223" font-size="12" fill="#64748b">rear surface silvered</text>

    <rect x="390" y="170" width="380" height="75" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="410" y="210" font-size="14" font-weight="bold" fill="#059669">(Q)</text>
    <text x="440" y="205" font-size="13" font-weight="bold" fill="#0f172a">Focus is formed at rear silvered pole (2R)</text>
    <text x="440" y="225" font-size="12" fill="#64748b">after double refraction and internal reflection</text>

    <!-- Row C -->
    <rect x="30" y="245" width="360" height="75" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="285" font-size="14" font-weight="bold" fill="#2563eb">(C)</text>
    <text x="80" y="278" font-size="13" font-weight="bold" fill="#0f172a">Thin convex lens immersed in liquid</text>
    <text x="80" y="298" font-size="12" fill="#64748b">having index μ_liquid &gt; μ_lens</text>

    <rect x="390" y="245" width="380" height="75" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="410" y="285" font-size="14" font-weight="bold" fill="#059669">(R)</text>
    <text x="440" y="280" font-size="13" font-weight="bold" fill="#0f172a">Sign of focal length reverses (Diverging)</text>
    <text x="440" y="300" font-size="12" fill="#64748b">converts converging behavior to diverging</text>

    <!-- Row D -->
    <rect x="30" y="320" width="360" height="75" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="360" font-size="14" font-weight="bold" fill="#2563eb">(D)</text>
    <text x="80" y="353" font-size="13" font-weight="bold" fill="#0f172a">Cylindrical rod TIR condition</text>
    <text x="80" y="373" font-size="12" fill="#64748b">total guidance for all entrance angles</text>

    <rect x="390" y="320" width="380" height="75" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="410" y="360" font-size="14" font-weight="bold" fill="#059669">(S)</text>
    <text x="440" y="355" font-size="13" font-weight="bold" fill="#0f172a">Minimum index threshold n ≥ √2</text>
    <text x="440" y="375" font-size="12" fill="#64748b">prevents ray escape through curved mantle</text>
  </svg>`,

  // #4: Chem Q6 - Squarate Dianion C4O4 2-
  'tikz_b37f8f8ad3a23d09.png': `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="340" viewBox="0 0 700 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="680" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="350" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Squarate Dianion (C₄O₄²⁻) - Delocalized Aromatic Core</text>

    <g transform="translate(350, 175)">
      <!-- 4-carbon square ring (half-size 45px) -->
      <!-- Vertices: (-45, -45), (45, -45), (45, 45), (-45, 45) -->
      <polygon points="-45,-45 45,-45 45,45 -45,45" fill="#f8fafc" stroke="#1e293b" stroke-width="3" />
      
      <!-- Central aromatic ring circle (2pi electrons) -->
      <circle cx="0" cy="0" r="26" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="5,4" />
      <text x="0" y="6" text-anchor="middle" font-size="13" font-weight="bold" fill="#2563eb">2π e⁻</text>

      <!-- 4 Exocyclic C-O bonds to oxygens with partial double bond dashes -->
      <!-- Top-left C to O -->
      <line x1="-45" y1="-45" x2="-95" y2="-95" stroke="#1e293b" stroke-width="3" />
      <line x1="-40" y1="-50" x2="-90" y2="-100" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,3" />
      <circle cx="-105" cy="-105" r="18" fill="#fef2f2" stroke="#dc2626" stroke-width="2" />
      <text x="-105" y="-99" text-anchor="middle" font-size="16" font-weight="bold" fill="#dc2626">O</text>
      <text x="-82" y="-120" font-size="12" font-weight="bold" fill="#dc2626">δ⁻</text>

      <!-- Top-right C to O -->
      <line x1="45" y1="-45" x2="95" y2="-95" stroke="#1e293b" stroke-width="3" />
      <line x1="40" y1="-50" x2="90" y2="-100" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,3" />
      <circle cx="105" cy="-105" r="18" fill="#fef2f2" stroke="#dc2626" stroke-width="2" />
      <text x="105" y="-99" text-anchor="middle" font-size="16" font-weight="bold" fill="#dc2626">O</text>
      <text x="125" y="-120" font-size="12" font-weight="bold" fill="#dc2626">δ⁻</text>

      <!-- Bottom-right C to O -->
      <line x1="45" y1="45" x2="95" y2="95" stroke="#1e293b" stroke-width="3" />
      <line x1="40" y1="50" x2="90" y2="100" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,3" />
      <circle cx="105" cy="105" r="18" fill="#fef2f2" stroke="#dc2626" stroke-width="2" />
      <text x="105" y="111" text-anchor="middle" font-size="16" font-weight="bold" fill="#dc2626">O</text>
      <text x="125" y="90" font-size="12" font-weight="bold" fill="#dc2626">δ⁻</text>

      <!-- Bottom-left C to O -->
      <line x1="-45" y1="45" x2="-95" y2="95" stroke="#1e293b" stroke-width="3" />
      <line x1="-40" y1="50" x2="-90" y2="100" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,3" />
      <circle cx="-105" cy="105" r="18" fill="#fef2f2" stroke="#dc2626" stroke-width="2" />
      <text x="-105" y="111" text-anchor="middle" font-size="16" font-weight="bold" fill="#dc2626">O</text>
      <text x="-82" y="90" font-size="12" font-weight="bold" fill="#dc2626">δ⁻</text>

      <!-- Bracket with 2- charge -->
      <path d="M -135,-120 L -145,-120 L -145,120 L -135,120" fill="none" stroke="#64748b" stroke-width="2" />
      <path d="M 135,-120 L 145,-120 L 145,120 L 135,120" fill="none" stroke="#64748b" stroke-width="2" />
      <text x="160" y="-100" font-size="22" font-weight="bold" fill="#2563eb">²⁻</text>

      <text x="0" y="135" text-anchor="middle" font-size="14" fill="#475569">Complete symmetric delocalization: C-O bond order = 1.25 across all 4 oxygens</text>
    </g>
  </svg>`,

  // #5: Math Q2 - Match Table: Points of Non-Differentiability
  'tikz_84626599819075f4.png': `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="780" height="380" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="400" y="42" text-anchor="middle" font-size="17" font-weight="bold" fill="#0f172a">Match Table: Points of Non-Differentiability in ℝ</text>

    <!-- Table Header -->
    <rect x="30" y="65" width="400" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="230" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-I (Function f(x))</text>
    <rect x="430" y="65" width="340" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="600" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-II (Number of Corner Points)</text>

    <!-- Row A -->
    <rect x="30" y="100" width="400" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="140" font-size="14" font-weight="bold" fill="#2563eb">(A)</text>
    <text x="80" y="135" font-size="15" font-weight="bold" fill="#0f172a">f(x) = |x| + |x - 1| + |x - 2|</text>
    <text x="80" y="155" font-size="12" fill="#64748b">Cusps at x = 0, 1, 2</text>

    <rect x="430" y="100" width="340" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="450" y="140" font-size="14" font-weight="bold" fill="#059669">(S)</text>
    <text x="480" y="140" font-size="15" font-weight="bold" fill="#0f172a">3 points (x ∈ {0, 1, 2})</text>

    <!-- Row B -->
    <rect x="30" y="170" width="400" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="210" font-size="14" font-weight="bold" fill="#2563eb">(B)</text>
    <text x="80" y="205" font-size="15" font-weight="bold" fill="#0f172a">g(x) = max{ |x|, x² }</text>
    <text x="80" y="225" font-size="12" fill="#64748b">Intersections at x = -1, 0, 1; smooth at 0</text>

    <rect x="430" y="170" width="340" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="450" y="210" font-size="14" font-weight="bold" fill="#059669">(R)</text>
    <text x="480" y="210" font-size="15" font-weight="bold" fill="#0f172a">2 points (x ∈ {-1, 1})</text>

    <!-- Row C -->
    <rect x="30" y="240" width="400" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="280" font-size="14" font-weight="bold" fill="#2563eb">(C)</text>
    <text x="80" y="275" font-size="15" font-weight="bold" fill="#0f172a">h(x) = |sin x| on (0, 2π)</text>
    <text x="80" y="295" font-size="12" fill="#64748b">Zero-crossing inside interval at x = π</text>

    <rect x="430" y="240" width="340" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="450" y="280" font-size="14" font-weight="bold" fill="#059669">(P)</text>
    <text x="480" y="280" font-size="15" font-weight="bold" fill="#0f172a">1 point (x = π)</text>

    <!-- Row D -->
    <rect x="30" y="310" width="400" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="350" font-size="14" font-weight="bold" fill="#2563eb">(D)</text>
    <text x="80" y="345" font-size="15" font-weight="bold" fill="#0f172a">k(x) = |x³ - x| = |x(x-1)(x+1)|</text>
    <text x="80" y="365" font-size="12" fill="#64748b">Cusps at roots x = -1, 0, 1</text>

    <rect x="430" y="310" width="340" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="450" y="350" font-size="14" font-weight="bold" fill="#059669">(Q)</text>
    <text x="480" y="350" font-size="15" font-weight="bold" fill="#0f172a">3 points (x ∈ {-1, 0, 1})</text>
  </svg>`,

  // #6: Chem Q7 - Dipole moment of Toluene vs α,α,α-Trifluorotoluene
  'tikz_d067969701c613d3.png': `<svg xmlns="http://www.w3.org/2000/svg" width="740" height="320" viewBox="0 0 740 320" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="720" height="300" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="370" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Dipole Moment Direction: +I / Hyperconjugation vs. -I / Reverse Hyperconjugation</text>

    <!-- Left: Toluene -->
    <g transform="translate(200, 175)">
      <!-- Benzene ring -->
      <polygon points="0,-35 30,-18 30,18 0,35 -30,18 -30,-18" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />
      
      <!-- C-CH3 bond -->
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="3" />
      <text x="0" y="-72" text-anchor="middle" font-size="17" font-weight="bold" fill="#0f172a">CH₃</text>
      
      <!-- Dipole vector arrow pointing INWARD towards the ring -->
      <line x1="45" y1="-65" x2="45" y2="-15" stroke="#16a34a" stroke-width="3" />
      <polygon points="45,-10 40,-22 50,-22" fill="#16a34a" />
      <!-- Plus tail on dipole arrow -->
      <line x1="38" y1="-65" x2="52" y2="-65" stroke="#16a34a" stroke-width="2.5" />

      <text x="0" y="65" text-anchor="middle" font-size="15" font-weight="bold" fill="#16a34a">Toluene (μ = 0.36 D)</text>
      <text x="0" y="85" text-anchor="middle" font-size="12" fill="#64748b">+I effect (+H into ring)</text>
    </g>

    <!-- Right: Trifluorotoluene -->
    <g transform="translate(540, 175)">
      <!-- Benzene ring -->
      <polygon points="0,-35 30,-18 30,18 0,35 -30,18 -30,-18" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="18" fill="none" stroke="#1e293b" stroke-width="2" />

      <!-- C-CF3 bond -->
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="3" />
      <text x="0" y="-72" text-anchor="middle" font-size="17" font-weight="bold" fill="#dc2626">CF₃</text>

      <!-- Dipole vector arrow pointing OUTWARD away from the ring -->
      <line x1="45" y1="-15" x2="45" y2="-65" stroke="#dc2626" stroke-width="3" />
      <polygon points="45,-70 40,-58 50,-58" fill="#dc2626" />
      <!-- Plus tail on dipole arrow -->
      <line x1="38" y1="-15" x2="52" y2="-15" stroke="#dc2626" stroke-width="2.5" />

      <text x="0" y="65" text-anchor="middle" font-size="15" font-weight="bold" fill="#dc2626">α,α,α-Trifluorotoluene (μ = 2.86 D)</text>
      <text x="0" y="85" text-anchor="middle" font-size="12" fill="#64748b">Reverse hyperconjugation (σ*C-F ← π)</text>
    </g>
  </svg>`,

  // #7: Phys Q7 - Refractive index gradient μ(y) = 1 + α·y
  'tikz_7df3519d1946d756.png': `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="340" viewBox="0 0 720 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="700" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="360" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Light Propagation in Inhomogeneous Medium: μ(y) = 1 + α·y</text>

    <!-- Axes -->
    <line x1="120" y1="100" x2="620" y2="100" stroke="#1e293b" stroke-width="2" /> <!-- x-axis (interface y=0) -->
    <line x1="120" y1="80" x2="120" y2="280" stroke="#1e293b" stroke-width="2" /> <!-- y-axis (depth pointing down) -->
    <polygon points="620,96 630,100 620,104" fill="#1e293b" />
    <polygon points="116,280 120,290 124,280" fill="#1e293b" />
    <text x="635" y="105" font-size="14" font-weight="bold" fill="#1e293b">x</text>
    <text x="120" y="305" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">y (depth)</text>
    <text x="105" y="95" font-size="14" font-weight="bold" fill="#1e293b">(0,0)</text>

    <!-- Air above (y < 0) -->
    <text x="250" y="80" font-size="14" font-weight="bold" fill="#64748b">Air (μ = 1.0)</text>

    <!-- Medium gradient background -->
    <rect x="121" y="101" width="498" height="178" fill="#f0f9ff" opacity="0.6" />
    <text x="400" y="140" font-size="14" font-weight="bold" fill="#0284c7">Medium: μ(y) = 1 + α·y (Increasing μ with depth)</text>

    <!-- Curved Ray trajectory (bending downward) -->
    <!-- Enters horizontally at (120, 100), bends continuously -->
    <path d="M 120,100 C 240,100 360,130 460,220" fill="none" stroke="#dc2626" stroke-width="3" />
    <polygon points="290,113 305,116 295,124" fill="#dc2626" />

    <!-- Tangent line at exit point (460, 220) showing 30 deg angle -->
    <line x1="410" y1="190" x2="530" y2="260" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,4" />
    <!-- Horizontal reference line at (460, 220) -->
    <line x1="460" y1="220" x2="550" y2="220" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4" />
    <path d="M 510,220 A 50 50 0 0 1 498,242" fill="none" stroke="#0f172a" stroke-width="2" />
    <text x="525" y="240" font-size="13" font-weight="bold" fill="#0f172a">θ = 30°</text>

    <!-- Snell's Law in stratified medium annotation -->
    <text x="360" y="270" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">By Snell's law: μ(y) cos(30°) = μ(0) cos(0°) ⇒ y = (2 - √3) / (√3·α)</text>
  </svg>`,

  // #8: Phys Q8 - Marginal ray on flat face of glass hemisphere
  'tikz_5952d48b30126449.png': `<svg xmlns="http://www.w3.org/2000/svg" width="740" height="340" viewBox="0 0 740 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="720" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="370" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Refraction of Marginal Ray at Curved Surface of Hemisphere (μ = 1.5)</text>

    <!-- Principal Axis -->
    <line x1="50" y1="170" x2="690" y2="170" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6,4" />

    <!-- Solid Glass Hemisphere: Center C at (250, 170), Radius R = 140 -->
    <!-- Flat face: vertical line from (250, 30) to (250, 310) -->
    <!-- Curved surface: arc from (250, 30) to (390, 170) to (250, 310) -->
    <path d="M 250,30 L 250,310 A 140 140 0 0 0 250,30 Z" fill="#f8fafc" stroke="#0284c7" stroke-width="2.5" />

    <!-- Center C -->
    <circle cx="250" cy="170" r="4" fill="#0f172a" />
    <text x="240" y="195" font-size="14" font-weight="bold" fill="#0f172a">C</text>

    <!-- Pole P of curved surface at (390, 170) -->
    <circle cx="390" cy="170" r="4" fill="#0f172a" />
    <text x="395" y="195" font-size="14" font-weight="bold" fill="#0f172a">P</text>

    <!-- Marginal Ray enters flat face at height h = R/2 = 70px (y = 100) -->
    <!-- Outside ray from x = 100 to 250 -->
    <line x1="100" y1="100" x2="250" y2="100" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="170,96 185,100 170,104" fill="#dc2626" />
    <text x="160" y="85" font-size="13" font-weight="bold" fill="#dc2626">h = R/2</text>

    <!-- Inside hemisphere: straight horizontal ray (normal incidence at flat face) to curved surface -->
    <!-- Curved surface intersection: x = 250 + sqrt(140^2 - 70^2) = 250 + 140*sqrt(3)/2 = 250 + 121.2 = 371.2 -->
    <line x1="250" y1="100" x2="371" y2="100" stroke="#dc2626" stroke-width="2.5" />

    <!-- Normal from Center C(250, 170) through boundary point (371, 100) -->
    <line x1="250" y1="170" x2="430" y2="65" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5,4" />

    <!-- Refracted ray emerging into air and intersecting axis at distance s from P -->
    <line x1="371" y1="100" x2="580" y2="170" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="460,126 475,133 463,138" fill="#dc2626" />

    <!-- Focus intersection on axis -->
    <circle cx="580" cy="170" r="4" fill="#16a34a" />
    <text x="580" y="195" text-anchor="middle" font-size="14" font-weight="bold" fill="#16a34a">F (s = R / (√5 - 1))</text>

    <!-- Dimension s from P(390) to F(580) -->
    <line x1="390" y1="230" x2="580" y2="230" stroke="#059669" stroke-width="2" marker-start="url(#dot)" marker-end="url(#dot)" />
    <text x="485" y="222" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">s</text>
  </svg>`,

  // #9: Chem Q8 - Rearrangement of 1-(cyclobut-1-yl)ethan-1-ol
  'tikz_93fe397fe70c7e03.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="300" viewBox="0 0 760 300" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="280" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="40" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Spontaneous Ring Expansion &amp; Hydride Shift Pathway</text>

    <!-- Step 1: 1-(cyclobut-1-yl)ethyl cation (2° cation) -->
    <g transform="translate(100, 150)">
      <!-- 4-membered ring -->
      <polygon points="-30,-30 20,-30 20,20 -30,20" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <!-- Ethyl cation tail at (20, -5) -->
      <line x1="20" y1="-5" x2="55" y2="-5" stroke="#1e293b" stroke-width="2.5" />
      <line x1="55" y1="-5" x2="75" y2="-25" stroke="#1e293b" stroke-width="2.5" />
      <text x="55" y="18" text-anchor="middle" font-size="14" font-weight="bold" fill="#2563eb">⁺CH-CH₃</text>
      <text x="0" y="48" text-anchor="middle" font-size="12" fill="#64748b">2° Cation (Strained)</text>
    </g>

    <!-- Arrow 1: Ring Expansion -->
    <g transform="translate(240, 145)">
      <line x1="0" y1="0" x2="60" y2="0" stroke="#1e293b" stroke-width="2" />
      <polygon points="60,0 50,-5 50,5" fill="#1e293b" />
      <text x="30" y="-10" text-anchor="middle" font-size="12" font-weight="bold" fill="#b91c1c">Ring</text>
      <text x="30" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#b91c1c">Expansion</text>
    </g>

    <!-- Step 2: 2-methylcyclopentyl cation (2° 5-membered ring) -->
    <g transform="translate(390, 150)">
      <!-- 5-membered ring -->
      <polygon points="0,-35 33,-11 21,30 -21,30 -33,-11" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <!-- Methyl at (0, -35), C+ at (33, -11) -->
      <line x1="0" y1="-35" x2="0" y2="-60" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-66" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">CH₃</text>
      <text x="45" y="-5" font-size="14" font-weight="bold" fill="#2563eb">⁺</text>
      <text x="0" y="52" text-anchor="middle" font-size="12" fill="#64748b">2° Cyclopentyl</text>
    </g>

    <!-- Arrow 2: 1,2-Hydride shift -->
    <g transform="translate(490, 145)">
      <line x1="0" y1="0" x2="60" y2="0" stroke="#1e293b" stroke-width="2" />
      <polygon points="60,0 50,-5 50,5" fill="#1e293b" />
      <text x="30" y="-10" text-anchor="middle" font-size="12" font-weight="bold" fill="#16a34a">1,2-H⁻</text>
      <text x="30" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#16a34a">Shift</text>
    </g>

    <!-- Step 3: 1-methylcyclopentyl cation (3° Cation - MOST STABLE) -->
    <g transform="translate(640, 150)">
      <polygon points="0,-35 33,-11 21,30 -21,30 -33,-11" fill="#eff6ff" stroke="#2563eb" stroke-width="3" />
      <line x1="0" y1="-35" x2="0" y2="-60" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-66" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f172a">CH₃</text>
      <circle cx="0" cy="-35" r="9" fill="#dbeafe" />
      <text x="14" y="-30" font-size="16" font-weight="bold" fill="#2563eb">⁺</text>
      <text x="0" y="52" text-anchor="middle" font-size="13" font-weight="bold" fill="#16a34a">1-Methylcyclopentyl (3°)</text>
      <text x="0" y="70" text-anchor="middle" font-size="11" fill="#059669">7 α-H, Maximum Stability</text>
    </g>
  </svg>`,

  // #10: Phys Q10 - Brewster Angle Isosceles Prism
  'tikz_164cbb5049970b76.png': `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="340" viewBox="0 0 700 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="680" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="350" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Brewster Polarization through Isosceles Prism (μ = √3)</text>

    <!-- Isosceles Prism: Apex at (350, 70), Base left (210, 270), Base right (490, 270) -->
    <polygon points="350,70 210,270 490,270" fill="#f8fafc" stroke="#0284c7" stroke-width="2.5" />
    <text x="350" y="60" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">Apex Angle A = 60°</text>

    <!-- Normal at face 1 -->
    <line x1="225" y1="120" x2="310" y2="185" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />

    <!-- Incident Ray at θ_B = 60° -->
    <line x1="120" y1="130" x2="270" y2="155" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="190,138 205,143 192,148" fill="#dc2626" />
    <text x="175" y="125" font-size="13" font-weight="bold" fill="#dc2626">θ_B = 60°</text>

    <!-- Inside Prism: Horizontal Ray parallel to base (r1 = 30°, r2 = 30°) -->
    <line x1="270" y1="155" x2="430" y2="155" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="345,151 360,155 345,159" fill="#dc2626" />
    <text x="350" y="180" text-anchor="middle" font-size="13" font-weight="bold" fill="#0284c7">r₁ = 30°, r₂ = 30°</text>

    <!-- Emerging Ray at θ_B = 60° on face 2 -->
    <line x1="430" y1="155" x2="580" y2="130" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="505,138 520,135 515,146" fill="#dc2626" />
    <text x="515" y="120" font-size="13" font-weight="bold" fill="#dc2626">θ_B = 60°</text>

    <!-- Polarization Dots / Bars -->
    <text x="350" y="300" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">tan(θ_B) = μ = √3 ⇒ θ_B = 60°, r = 30° ⇒ A = r₁ + r₂ = 60°</text>
  </svg>`,

  // #11: Phys Q13 - Lens in liquid of higher refractive index
  'tikz_6451e12b8c5fbf5c.png': `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="340" viewBox="0 0 720 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="700" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="360" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Convex Glass Lens (μ = 1.5) Immersed in Liquid (μ = 1.6)</text>

    <!-- Liquid Container -->
    <rect x="120" y="65" width="480" height="235" rx="8" fill="#f0f9ff" stroke="#0284c7" stroke-width="2" opacity="0.7" />
    <text x="140" y="90" font-size="14" font-weight="bold" fill="#0369a1">Transparent Liquid (μ_l = 1.6)</text>

    <!-- Optical Axis -->
    <line x1="50" y1="180" x2="670" y2="180" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6,4" />

    <!-- Biconvex Lens at Center (x = 360) -->
    <path d="M 360,95 Q 335,180 360,265 Q 385,180 360,95 Z" fill="#ffffff" stroke="#1e293b" stroke-width="2.5" />
    <text x="360" y="130" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">μ_g = 1.5</text>
    <text x="360" y="150" text-anchor="middle" font-size="12" fill="#64748b">(f_air = +20 cm)</text>

    <!-- Incident Parallel Rays from Left -->
    <line x1="140" y1="140" x2="350" y2="140" stroke="#dc2626" stroke-width="2.5" />
    <line x1="140" y1="220" x2="350" y2="220" stroke="#dc2626" stroke-width="2.5" />

    <!-- Diverging Refracted Rays because μ_l > μ_g -->
    <line x1="370" y1="140" x2="580" y2="105" stroke="#dc2626" stroke-width="2.5" />
    <line x1="370" y1="220" x2="580" y2="255" stroke="#dc2626" stroke-width="2.5" />

    <!-- Virtual Focus Extension backwards -->
    <line x1="370" y1="140" x2="160" y2="180" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,4" />
    <line x1="370" y1="220" x2="160" y2="180" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4,4" />
    <circle cx="160" cy="180" r="4" fill="#dc2626" />
    <text x="160" y="202" text-anchor="middle" font-size="13" font-weight="bold" fill="#dc2626">F' (-160 cm)</text>

    <text x="360" y="285" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">1/f_liq = (1.5/1.6 - 1) × (2/R) ⇒ f_liq = -160 cm (Diverging Lens)</text>
  </svg>`,

  // #12: Phys Q14 - Equilateral Prism Minimum Deviation
  'tikz_ada89676d27e775f.png': `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="340" viewBox="0 0 700 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="680" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="350" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Minimum Deviation Condition: Equilateral Prism (A = 60°, μ = √3)</text>

    <!-- Equilateral Triangle: A=(350, 75), B=(220, 280), C=(480, 280) -->
    <polygon points="350,75 220,280 480,280" fill="#f8fafc" stroke="#0284c7" stroke-width="2.5" />
    <text x="350" y="105" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f172a">A = 60°</text>

    <!-- Normal lines -->
    <line x1="230" y1="120" x2="320" y2="200" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />
    <line x1="470" y1="120" x2="380" y2="200" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />

    <!-- Incident Ray: i = 60° -->
    <line x1="140" y1="110" x2="275" y2="165" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="200,132 215,140 203,147" fill="#dc2626" />
    <text x="180" y="125" font-size="14" font-weight="bold" fill="#dc2626">i = 60°</text>

    <!-- Symmetrical Ray parallel to base BC -->
    <line x1="275" y1="165" x2="425" y2="165" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="345,161 360,165 345,169" fill="#dc2626" />
    <text x="350" y="190" text-anchor="middle" font-size="13" font-weight="bold" fill="#0284c7">r = 30°</text>

    <!-- Emerging Ray: e = 60° -->
    <line x1="425" y1="165" x2="560" y2="220" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="495,190 510,197 500,203" fill="#dc2626" />
    <text x="510" y="180" font-size="14" font-weight="bold" fill="#dc2626">e = 60°</text>

    <!-- Straight through extension to measure delta_m -->
    <line x1="275" y1="165" x2="490" y2="250" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,3" />
    <text x="510" y="270" font-size="14" font-weight="bold" fill="#16a34a">δ_m = 2i - A = 60°</text>
  </svg>`,

  // #13: Phys Q15 - Cylindrical Rod Total Internal Reflection Condition
  'tikz_09ff56c4a6a403c6.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Total Internal Reflection in Cylindrical Rod (Light Pipe: n ≥ √2)</text>

    <!-- Cylindrical Rod Body -->
    <rect x="220" y="90" width="460" height="160" fill="#f8fafc" stroke="#0284c7" stroke-width="2.5" />
    <!-- Circular Entrance Face ellipse -->
    <ellipse cx="220" cy="170" rx="20" ry="80" fill="#f1f5f9" stroke="#0284c7" stroke-width="2.5" />

    <!-- Axis -->
    <line x1="120" y1="170" x2="700" y2="170" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="6,4" />

    <!-- Extreme incident ray: theta_i = 90° grazing incidence -->
    <line x1="120" y1="210" x2="220" y2="170" stroke="#dc2626" stroke-width="2.5" />
    <polygon points="165,190 180,186 172,197" fill="#dc2626" />
    <text x="135" y="160" font-size="13" font-weight="bold" fill="#dc2626">θ_i ≤ 90°</text>

    <!-- Refracted ray to upper mantle: strikes at (350, 90) -->
    <line x1="220" y1="170" x2="350" y2="90" stroke="#dc2626" stroke-width="2.5" />
    <!-- Normal to upper mantle -->
    <line x1="350" y1="60" x2="350" y2="130" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4" />

    <!-- Reflected TIR ray downwards to lower mantle -->
    <line x1="350" y1="90" x2="520" y2="250" stroke="#dc2626" stroke-width="2.5" />
    <!-- Reflected back up -->
    <line x1="520" y1="250" x2="650" y2="120" stroke="#dc2626" stroke-width="2.5" />

    <text x="365" y="80" font-size="13" font-weight="bold" fill="#059669">TIR: φ ≥ θ_c</text>
    <text x="380" y="295" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">Condition for total guidance: sin²θ_i + sin²θ_c ≤ n² ⇒ n ≥ √2 ≈ 1.414</text>
  </svg>`,

  // #14: Chem Q9 - Halide ion reactivity in Protic vs Aprotic solvents
  'tikz_5698ee6296ac76e6.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Solvent Cage Effect: Nucleophilicity vs Basicity of Halide Ions</text>

    <!-- Left Box: Polar Protic (H2O, EtOH) -->
    <rect x="40" y="70" width="330" height="230" rx="10" fill="#f0f9ff" stroke="#0284c7" stroke-width="2" />
    <text x="205" y="100" text-anchor="middle" font-size="16" font-weight="bold" fill="#0369a1">Polar Protic Solvents (e.g. H₂O)</text>
    <text x="205" y="125" text-anchor="middle" font-size="12" fill="#64748b">Strong H-bonding encages small F⁻ tightly</text>
    
    <!-- Nucleophilicity order in protic -->
    <rect x="60" y="145" width="290" height="45" rx="6" fill="#ffffff" stroke="#bae6fd" />
    <text x="205" y="173" text-anchor="middle" font-size="15" font-weight="bold" fill="#0284c7">I⁻ &gt; Br⁻ &gt; Cl⁻ &gt; F⁻</text>
    <text x="205" y="215" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">Least solvated = Best nucleophile</text>
    <text x="205" y="240" text-anchor="middle" font-size="12" fill="#64748b">I⁻ has highest polarizability</text>
    <text x="205" y="275" text-anchor="middle" font-size="13" font-weight="bold" fill="#059669">✓ Statement I is Correct</text>

    <!-- Right Box: Polar Aprotic (DMSO, DMF, Acetone) -->
    <rect x="390" y="70" width="330" height="230" rx="10" fill="#fef2f2" stroke="#dc2626" stroke-width="2" />
    <text x="555" y="100" text-anchor="middle" font-size="16" font-weight="bold" fill="#b91c1c">Polar Aprotic Solvents (e.g. DMSO)</text>
    <text x="555" y="125" text-anchor="middle" font-size="12" fill="#64748b">Cations solvated; anions remain naked</text>

    <!-- Nucleophilicity order in aprotic -->
    <rect x="410" y="145" width="290" height="45" rx="6" fill="#ffffff" stroke="#fecaca" />
    <text x="555" y="173" text-anchor="middle" font-size="15" font-weight="bold" fill="#dc2626">F⁻ &gt; Cl⁻ &gt; Br⁻ &gt; I⁻</text>
    <text x="555" y="215" text-anchor="middle" font-size="13" font-weight="bold" fill="#0f172a">Parallels gas-phase basicity</text>
    <text x="555" y="240" text-anchor="middle" font-size="12" fill="#64748b">Naked high charge density of F⁻</text>
    <text x="555" y="275" text-anchor="middle" font-size="13" font-weight="bold" fill="#059669">✓ Statement II is Correct</text>
  </svg>`,

  // #15: Chem Q11 - Heat of Hydrogenation (Z)-but-2-ene vs (E)-but-2-ene
  'tikz_d0680586e81e0b11.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Thermodynamic Stability and Heat of Hydrogenation: Cis vs. Trans But-2-ene</text>

    <!-- Energy Diagram Axes -->
    <line x1="80" y1="280" x2="680" y2="280" stroke="#1e293b" stroke-width="2" /> <!-- Reaction Coordinate -->
    <line x1="80" y1="280" x2="80" y2="70" stroke="#1e293b" stroke-width="2" /> <!-- Potential Energy -->
    <polygon points="76,70 80,60 84,70" fill="#1e293b" />
    <text x="75" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e293b">Energy (kJ/mol)</text>

    <!-- Level 1: Cis-(Z)-but-2-ene (Higher energy due to steric strain) at y = 110 -->
    <line x1="140" y1="110" x2="280" y2="110" stroke="#dc2626" stroke-width="3" />
    <text x="210" y="95" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">(Z)-but-2-ene (cis)</text>
    <text x="210" y="130" text-anchor="middle" font-size="12" fill="#64748b">Steric Repulsion of -CH₃</text>

    <!-- Level 2: Trans-(E)-but-2-ene (Lower energy) at y = 150 -->
    <line x1="340" y1="150" x2="480" y2="150" stroke="#2563eb" stroke-width="3" />
    <text x="410" y="135" text-anchor="middle" font-size="14" font-weight="bold" fill="#2563eb">(E)-but-2-ene (trans)</text>
    <text x="410" y="170" text-anchor="middle" font-size="12" fill="#64748b">Sterically Unhindered</text>

    <!-- Common Product: Butane at y = 250 -->
    <line x1="540" y1="250" x2="660" y2="250" stroke="#16a34a" stroke-width="3" />
    <text x="600" y="240" text-anchor="middle" font-size="14" font-weight="bold" fill="#16a34a">Butane</text>

    <!-- Delta H arrows downwards to Butane -->
    <line x1="280" y1="110" x2="540" y2="250" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,4" />
    <line x1="480" y1="150" x2="540" y2="250" stroke="#2563eb" stroke-width="2" stroke-dasharray="4,4" />

    <!-- Labels for Delta H -->
    <text x="230" y="210" font-size="13" font-weight="bold" fill="#dc2626">ΔH_hydro(cis) = -120 kJ/mol</text>
    <text x="400" y="210" font-size="13" font-weight="bold" fill="#2563eb">ΔH_hydro(trans) = -115 kJ/mol</text>
    <text x="380" y="305" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">|ΔH(cis)| &gt; |ΔH(trans)| ⇒ Both Statements I &amp; II are TRUE</text>
  </svg>`,

  // #16: Chem Q12 - Cyclic Species Hückel Classification Match Table
  'tikz_980b58d6f911e850.png': `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="780" height="380" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="400" y="42" text-anchor="middle" font-size="17" font-weight="bold" fill="#0f172a">Match Table: Cyclic Species &amp; Hückel Aromaticity Classification</text>

    <!-- Table Header -->
    <rect x="30" y="65" width="380" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="220" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-I (Cyclic Species)</text>
    <rect x="410" y="65" width="360" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="590" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-II (Hückel Nature)</text>

    <!-- Row A -->
    <rect x="30" y="100" width="380" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="140" font-size="14" font-weight="bold" fill="#2563eb">(A)</text>
    <text x="80" y="135" font-size="15" font-weight="bold" fill="#0f172a">Cyclopropenyl Cation (C₃H₃⁺)</text>
    <text x="80" y="155" font-size="12" fill="#64748b">3-membered ring with double bond and C⁺</text>

    <rect x="410" y="100" width="360" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="430" y="140" font-size="14" font-weight="bold" fill="#059669">(P)</text>
    <text x="460" y="140" font-size="15" font-weight="bold" fill="#0f172a">Aromatic (2π electrons, 4n+2 for n=0)</text>

    <!-- Row B -->
    <rect x="30" y="170" width="380" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="210" font-size="14" font-weight="bold" fill="#2563eb">(B)</text>
    <text x="80" y="205" font-size="15" font-weight="bold" fill="#0f172a">Cyclooctatetraene (COT, C₈H₈)</text>
    <text x="80" y="225" font-size="12" fill="#64748b">Tub-shaped non-planar conformation</text>

    <rect x="410" y="170" width="360" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="430" y="210" font-size="14" font-weight="bold" fill="#059669">(Q)</text>
    <text x="460" y="210" font-size="15" font-weight="bold" fill="#0f172a">Non-Aromatic (Escapes anti-aromaticity)</text>

    <!-- Row C -->
    <rect x="30" y="240" width="380" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="280" font-size="14" font-weight="bold" fill="#2563eb">(C)</text>
    <text x="80" y="275" font-size="15" font-weight="bold" fill="#0f172a">Cyclopentadienyl Anion (C₅H₅⁻)</text>
    <text x="80" y="295" font-size="12" fill="#64748b">5-membered ring with lone pair delocalization</text>

    <rect x="410" y="240" width="360" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="430" y="280" font-size="14" font-weight="bold" fill="#059669">(R)</text>
    <text x="460" y="280" font-size="15" font-weight="bold" fill="#0f172a">Aromatic (6π electrons, 4n+2 for n=1)</text>

    <!-- Row D -->
    <rect x="30" y="310" width="380" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="350" font-size="14" font-weight="bold" fill="#2563eb">(D)</text>
    <text x="80" y="345" font-size="15" font-weight="bold" fill="#0f172a">Cyclobutadiene (C₄H₄)</text>
    <text x="80" y="365" font-size="12" fill="#64748b">Planar square ring with 2 conjugated double bonds</text>

    <rect x="410" y="310" width="360" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="430" y="350" font-size="14" font-weight="bold" fill="#059669">(S)</text>
    <text x="460" y="350" font-size="15" font-weight="bold" fill="#0f172a">Anti-Aromatic (4π electrons, 4n for n=1)</text>
  </svg>`,

  // #17: Chem Q13 - Substituted Phenols pKa Values Match Table
  'tikz_908b2d3b6fd39636.png': `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="780" height="380" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="400" y="42" text-anchor="middle" font-size="17" font-weight="bold" fill="#0f172a">Match Table: Substituted Phenols &amp; Their pKa Values</text>

    <!-- Table Header -->
    <rect x="30" y="65" width="380" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="220" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-I (Phenolic Compound)</text>
    <rect x="410" y="65" width="360" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="590" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-II (pKa Value at 25°C)</text>

    <!-- Row A -->
    <rect x="30" y="100" width="380" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="140" font-size="14" font-weight="bold" fill="#2563eb">(A)</text>
    <text x="80" y="135" font-size="15" font-weight="bold" fill="#0f172a">2,4,6-Trinitrophenol (Picric Acid)</text>
    <text x="80" y="155" font-size="12" fill="#64748b">Three powerful -M / -I NO₂ groups</text>

    <rect x="410" y="100" width="360" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="430" y="140" font-size="14" font-weight="bold" fill="#059669">(P)</text>
    <text x="460" y="140" font-size="15" font-weight="bold" fill="#0f172a">pKa ≈ 0.38 (Comparable to mineral acid)</text>

    <!-- Row B -->
    <rect x="30" y="170" width="380" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="210" font-size="14" font-weight="bold" fill="#2563eb">(B)</text>
    <text x="80" y="205" font-size="15" font-weight="bold" fill="#0f172a">4-Nitrophenol (p-Nitrophenol)</text>
    <text x="80" y="225" font-size="12" fill="#64748b">Para -M / -I stabilization of phenoxide</text>

    <rect x="410" y="170" width="360" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="430" y="210" font-size="14" font-weight="bold" fill="#059669">(Q)</text>
    <text x="460" y="210" font-size="15" font-weight="bold" fill="#0f172a">pKa ≈ 7.15</text>

    <!-- Row C -->
    <rect x="30" y="240" width="380" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="280" font-size="14" font-weight="bold" fill="#2563eb">(C)</text>
    <text x="80" y="275" font-size="15" font-weight="bold" fill="#0f172a">Phenol (C₆H₅OH)</text>
    <text x="80" y="295" font-size="12" fill="#64748b">Standard unsubstituted reference</text>

    <rect x="410" y="240" width="360" height="70" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="430" y="280" font-size="14" font-weight="bold" fill="#059669">(R)</text>
    <text x="460" y="280" font-size="15" font-weight="bold" fill="#0f172a">pKa ≈ 9.95</text>

    <!-- Row D -->
    <rect x="30" y="310" width="380" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="350" font-size="14" font-weight="bold" fill="#2563eb">(D)</text>
    <text x="80" y="345" font-size="15" font-weight="bold" fill="#0f172a">4-Methylphenol (p-Cresol)</text>
    <text x="80" y="365" font-size="12" fill="#64748b">Electron-donating +I / +H methyl group</text>

    <rect x="410" y="310" width="360" height="70" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="430" y="350" font-size="14" font-weight="bold" fill="#059669">(S)</text>
    <text x="460" y="350" font-size="15" font-weight="bold" fill="#0f172a">pKa ≈ 10.26 (Weakest acid)</text>
  </svg>`,

  // #18: Chem Question Bank - Match Table
  'tikz_2c9c2932bf0ce448.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="380" viewBox="0 0 760 380" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="360" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="17" font-weight="bold" fill="#0f172a">Match Table: Qualitative Organic Reagents &amp; Observations</text>

    <rect x="30" y="65" width="350" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="205" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-I (Test / Reagent)</text>
    <rect x="380" y="65" width="350" height="35" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="555" y="88" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">List-II (Target Functional Group)</text>

    <rect x="30" y="100" width="350" height="65" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="138" font-size="14" font-weight="bold" fill="#2563eb">P</text>
    <text x="80" y="138" font-size="15" font-weight="bold" fill="#0f172a">Lucas Test (conc. HCl + ZnCl₂)</text>

    <rect x="380" y="100" width="350" height="65" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="400" y="138" font-size="14" font-weight="bold" fill="#059669">1</text>
    <text x="430" y="138" font-size="15" font-weight="bold" fill="#0f172a">1°, 2°, 3° Alcohols Differentiation</text>

    <rect x="30" y="165" width="350" height="65" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="203" font-size="14" font-weight="bold" fill="#2563eb">Q</text>
    <text x="80" y="203" font-size="15" font-weight="bold" fill="#0f172a">Tollens' Reagent [Ag(NH₃)₂]⁺</text>

    <rect x="380" y="165" width="350" height="65" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="400" y="203" font-size="14" font-weight="bold" fill="#059669">2</text>
    <text x="430" y="203" font-size="15" font-weight="bold" fill="#0f172a">Aldehydes (Silver Mirror formation)</text>

    <rect x="30" y="230" width="350" height="65" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="268" font-size="14" font-weight="bold" fill="#2563eb">R</text>
    <text x="80" y="268" font-size="15" font-weight="bold" fill="#0f172a">Neutral FeCl₃ Solution</text>

    <rect x="380" y="230" width="350" height="65" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />
    <text x="400" y="268" font-size="14" font-weight="bold" fill="#059669">3</text>
    <text x="430" y="268" font-size="15" font-weight="bold" fill="#0f172a">Phenols (Violet complex)</text>

    <rect x="30" y="295" width="350" height="65" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="50" y="333" font-size="14" font-weight="bold" fill="#2563eb">S</text>
    <text x="80" y="333" font-size="15" font-weight="bold" fill="#0f172a">Iodoform Test (I₂ + NaOH)</text>

    <rect x="380" y="295" width="350" height="65" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
    <text x="400" y="333" font-size="14" font-weight="bold" fill="#059669">4</text>
    <text x="430" y="333" font-size="15" font-weight="bold" fill="#0f172a">Methyl ketones / CH₃-CH(OH)-</text>
  </svg>`,

  // #19: Chem Q14 - Hydration & Basicity of Methyl Amines in Aqueous Solution
  'tikz_e26ccc1c5795bcd5.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Aqueous Basicity of Methyl Amines: Combined Inductive, Steric &amp; Hydration Effects</text>

    <!-- Comparison of 3 Cations Hydration -->
    <!-- (1) 2° Amine Cation (CH3)2NH2+ (2 H-bonds) -->
    <g transform="translate(140, 150)">
      <circle cx="0" cy="0" r="32" fill="#eff6ff" stroke="#2563eb" stroke-width="2.5" />
      <text x="0" y="5" text-anchor="middle" font-size="14" font-weight="bold" fill="#2563eb">(CH₃)₂NH₂⁺</text>
      <!-- 2 H-bonds to H2O -->
      <line x1="-32" y1="-10" x2="-65" y2="-20" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,3" />
      <text x="-75" y="-22" font-size="12" font-weight="bold" fill="#0284c7">H₂O</text>
      <line x1="-32" y1="10" x2="-65" y2="20" stroke="#dc2626" stroke-width="2" stroke-dasharray="3,3" />
      <text x="-75" y="28" font-size="12" font-weight="bold" fill="#0284c7">H₂O</text>
      <text x="0" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#16a34a">MOST BASIC (2°)</text>
      <text x="0" y="75" text-anchor="middle" font-size="11" fill="#64748b">Optimal +I &amp; Hydration</text>
    </g>

    <!-- Greater than sign -->
    <text x="255" y="158" font-size="28" font-weight="bold" fill="#64748b">&gt;</text>

    <!-- (2) 1° Amine Cation CH3NH3+ (3 H-bonds) -->
    <g transform="translate(360, 150)">
      <circle cx="0" cy="0" r="32" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="5" text-anchor="middle" font-size="14" font-weight="bold" fill="#0f172a">CH₃NH₃⁺</text>
      <text x="0" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#2563eb">2nd MOST BASIC (1°)</text>
      <text x="0" y="75" text-anchor="middle" font-size="11" fill="#64748b">High Hydration, Lower +I</text>
    </g>

    <!-- Greater than sign -->
    <text x="475" y="158" font-size="28" font-weight="bold" fill="#64748b">&gt;</text>

    <!-- (3) 3° Amine Cation (CH3)3NH+ (Only 1 H-bond, heavy steric crowding) -->
    <g transform="translate(580, 150)">
      <circle cx="0" cy="0" r="32" fill="#fef2f2" stroke="#dc2626" stroke-width="2.5" />
      <text x="0" y="5" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">(CH₃)₃NH⁺</text>
      <text x="0" y="55" text-anchor="middle" font-size="13" font-weight="bold" fill="#dc2626">3rd (3° Amine)</text>
      <text x="0" y="75" text-anchor="middle" font-size="11" fill="#64748b">Severe Steric Hindrance</text>
    </g>

    <text x="380" y="300" text-anchor="middle" font-size="15" font-weight="bold" fill="#059669">Decreasing Order: (CH₃)₂NH &gt; CH₃NH₂ &gt; (CH₃)₃N &gt; NH₃</text>
  </svg>`,

  // #20: Chem Q15 - Dipole Moments of Isomeric Dichlorobenzenes
  'tikz_389ae30acb8dd2b2.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Dipole Moment Vector Addition: Isomeric Dichlorobenzenes</text>

    <!-- Para (1,4-dichlorobenzene): theta = 180°, mu = 0 -->
    <g transform="translate(140, 165)">
      <polygon points="0,-35 30,-18 30,18 0,35 -30,18 -30,-18" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="16" fill="none" stroke="#1e293b" stroke-width="1.8" />
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="15" font-weight="bold" fill="#1e293b">Cl</text>
      <line x1="0" y1="35" x2="0" y2="65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="82" text-anchor="middle" font-size="15" font-weight="bold" fill="#1e293b">Cl</text>
      <text x="0" y="105" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">Para (θ = 180°)</text>
      <text x="0" y="125" text-anchor="middle" font-size="13" font-weight="bold" fill="#2563eb">μ_net = 0 D</text>
    </g>

    <text x="250" y="170" font-size="24" font-weight="bold" fill="#64748b">&lt;</text>

    <!-- Meta (1,3-dichlorobenzene): theta = 120°, mu = mu0 -->
    <g transform="translate(380, 165)">
      <polygon points="0,-35 30,-18 30,18 0,35 -30,18 -30,-18" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="16" fill="none" stroke="#1e293b" stroke-width="1.8" />
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="15" font-weight="bold" fill="#1e293b">Cl</text>
      <line x1="30" y1="18" x2="55" y2="35" stroke="#1e293b" stroke-width="2.5" />
      <text x="65" y="45" font-size="15" font-weight="bold" fill="#1e293b">Cl</text>
      <text x="0" y="105" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">Meta (θ = 120°)</text>
      <text x="0" y="125" text-anchor="middle" font-size="13" font-weight="bold" fill="#2563eb">μ_net ≈ 1.72 D</text>
    </g>

    <text x="490" y="170" font-size="24" font-weight="bold" fill="#64748b">&lt;</text>

    <!-- Ortho (1,2-dichlorobenzene): theta = 60°, mu = sqrt(3)*mu0 -->
    <g transform="translate(620, 165)">
      <polygon points="0,-35 30,-18 30,18 0,35 -30,18 -30,-18" fill="#f8fafc" stroke="#1e293b" stroke-width="2.5" />
      <circle cx="0" cy="0" r="16" fill="none" stroke="#1e293b" stroke-width="1.8" />
      <line x1="0" y1="-35" x2="0" y2="-65" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-72" text-anchor="middle" font-size="15" font-weight="bold" fill="#1e293b">Cl</text>
      <line x1="30" y1="-18" x2="55" y2="-32" stroke="#1e293b" stroke-width="2.5" />
      <text x="65" y="-35" font-size="15" font-weight="bold" fill="#1e293b">Cl</text>
      <text x="0" y="105" text-anchor="middle" font-size="14" font-weight="bold" fill="#059669">Ortho (θ = 60°)</text>
      <text x="0" y="125" text-anchor="middle" font-size="13" font-weight="bold" fill="#2563eb">μ_net ≈ 2.54 D</text>
    </g>
  </svg>`,

  // #21: Chem Q16 - Keto-Enol Tautomerism Candidate Compounds
  'tikz_233c7d5a6503326f.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="320" viewBox="0 0 760 320" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="300" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Identification of Compounds Incapable of Keto-Enol Tautomerism</text>

    <!-- (A) Acetophenone (Enolizable: has 3 alpha-H on methyl) -->
    <g transform="translate(100, 160)">
      <polygon points="0,-25 22,-12 22,12 0,25 -22,12 -22,-12" fill="#f8fafc" stroke="#1e293b" stroke-width="2" />
      <line x1="22" y1="-12" x2="48" y2="-12" stroke="#1e293b" stroke-width="2.5" />
      <line x1="48" y1="-12" x2="48" y2="-38" stroke="#1e293b" stroke-width="2" />
      <text x="48" y="-45" text-anchor="middle" font-size="13" font-weight="bold" fill="#dc2626">O</text>
      <line x1="48" y1="-12" x2="72" y2="0" stroke="#1e293b" stroke-width="2" />
      <text x="82" y="15" text-anchor="middle" font-size="12" font-weight="bold" fill="#16a34a">CH₃ (3α-H)</text>
      <text x="30" y="60" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e293b">(A) Enolizable</text>
    </g>

    <!-- (B) Cyclohexanone (Enolizable: has 4 alpha-H on ring) -->
    <g transform="translate(280, 160)">
      <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="#f8fafc" stroke="#1e293b" stroke-width="2" />
      <line x1="0" y1="-30" x2="0" y2="-55" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-62" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">O</text>
      <text x="0" y="60" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e293b">(B) Enolizable</text>
    </g>

    <!-- (C) Benzophenone / Bicyclo[2.2.1]bridgehead carbonyl (NO enolizable alpha-H) -->
    <g transform="translate(480, 160)">
      <!-- Central Carbonyl C=O -->
      <circle cx="0" cy="0" r="10" fill="#fef2f2" stroke="#dc2626" stroke-width="2" />
      <line x1="0" y1="-10" x2="0" y2="-35" stroke="#1e293b" stroke-width="2.5" />
      <text x="0" y="-42" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">O</text>
      <!-- Two Phenyl Rings attached -->
      <line x1="-10" y1="0" x2="-35" y2="0" stroke="#1e293b" stroke-width="2" />
      <polygon points="-55,-20 -35,-10 -35,10 -55,20 -75,10 -75,-10" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8" />
      <line x1="10" y1="0" x2="35" y2="0" stroke="#1e293b" stroke-width="2" />
      <polygon points="55,-20 75,-10 75,10 55,20 35,10 35,-10" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8" />
      <text x="0" y="40" text-anchor="middle" font-size="12" font-weight="bold" fill="#dc2626">No α-Hydrogen (sp² carbons)</text>
      <text x="0" y="60" text-anchor="middle" font-size="13" font-weight="bold" fill="#dc2626">(C) CANNOT Enolize</text>
    </g>

    <!-- (D) Acetaldehyde (Enolizable: has 3 alpha-H) -->
    <g transform="translate(660, 160)">
      <line x1="-30" y1="0" x2="0" y2="0" stroke="#1e293b" stroke-width="2.5" />
      <text x="-45" y="5" text-anchor="middle" font-size="13" font-weight="bold" fill="#16a34a">CH₃</text>
      <line x1="0" y1="0" x2="0" y2="-30" stroke="#1e293b" stroke-width="2" />
      <text x="0" y="-38" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">O</text>
      <line x1="0" y1="0" x2="25" y2="15" stroke="#1e293b" stroke-width="2" />
      <text x="35" y="25" font-size="13" font-weight="bold" fill="#1e293b">H</text>
      <text x="0" y="60" text-anchor="middle" font-size="13" font-weight="bold" fill="#1e293b">(D) Enolizable</text>
    </g>
  </svg>`,

  // #22: Math Q15 - Quadrilaterals from Points on Parallel Lines L1 and L2
  'tikz_a539e99b06258b4c.png': `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="340" viewBox="0 0 760 340" style="background:#ffffff; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
    <rect x="10" y="10" width="740" height="320" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <text x="380" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">Combinatorics: Quadrilaterals Formed by Points on Two Parallel Lines</text>

    <!-- Line L1 (top, y = 110) with 6 points -->
    <line x1="80" y1="110" x2="680" y2="110" stroke="#2563eb" stroke-width="2.5" />
    <text x="50" y="115" font-size="16" font-weight="bold" fill="#2563eb">L₁</text>
    <text x="50" y="135" font-size="12" fill="#64748b">(6 points)</text>

    <!-- 6 points on L1 at x = 140, 230, 320, 410, 500, 590 -->
    <!-- Point 2 (230) and Point 4 (410) selected for quadrilateral -->
    <circle cx="140" cy="110" r="5" fill="#2563eb" />
    <circle cx="230" cy="110" r="7" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
    <text x="230" y="95" text-anchor="middle" font-size="12" font-weight="bold" fill="#dc2626">A</text>
    <circle cx="320" cy="110" r="5" fill="#2563eb" />
    <circle cx="410" cy="110" r="7" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
    <text x="410" y="95" text-anchor="middle" font-size="12" font-weight="bold" fill="#dc2626">B</text>
    <circle cx="500" cy="110" r="5" fill="#2563eb" />
    <circle cx="590" cy="110" r="5" fill="#2563eb" />

    <!-- Line L2 (bottom, y = 230) with 5 points -->
    <line x1="80" y1="230" x2="680" y2="230" stroke="#059669" stroke-width="2.5" />
    <text x="50" y="235" font-size="16" font-weight="bold" fill="#059669">L₂</text>
    <text x="50" y="255" font-size="12" fill="#64748b">(5 points)</text>

    <!-- 5 points on L2 at x = 180, 280, 380, 480, 580 -->
    <!-- Point 1 (180) and Point 4 (480) selected for quadrilateral -->
    <circle cx="180" cy="230" r="7" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
    <text x="180" y="255" text-anchor="middle" font-size="12" font-weight="bold" fill="#dc2626">D</text>
    <circle cx="280" cy="230" r="5" fill="#059669" />
    <circle cx="380" cy="230" r="5" fill="#059669" />
    <circle cx="480" cy="230" r="7" fill="#dc2626" stroke="#ffffff" stroke-width="2" />
    <text x="480" y="255" text-anchor="middle" font-size="12" font-weight="bold" fill="#dc2626">C</text>
    <circle cx="580" cy="230" r="5" fill="#059669" />

    <!-- Quadrilateral Polygon ABCD -->
    <polygon points="230,110 410,110 480,230 180,230" fill="#fef2f2" fill-opacity="0.6" stroke="#dc2626" stroke-width="2" stroke-dasharray="5,4" />

    <text x="380" y="295" text-anchor="middle" font-size="15" font-weight="bold" fill="#0f172a">To form a quadrilateral, choose 2 points from L₁ and 2 points from L₂:</text>
    <text x="380" y="318" text-anchor="middle" font-size="16" font-weight="bold" fill="#dc2626">Total Quadrilaterals = ⁶C₂ × ⁵C₂ = 15 × 10 = 150</text>
  </svg>`
};

async function main() {
  console.log('--- STARTING COMPLETE IAT & QUESTION BANK DIAGRAM RESTORATION ---');
  const filenames = Object.keys(DIAGRAM_SVGS);
  console.log(`Found ${filenames.length} SVG diagram specifications.`);

  // Step 1: Render high-res PNGs
  for (const filename of filenames) {
    const svgStr = DIAGRAM_SVGS[filename];
    const outPath = path.join(OUT_DIR, filename);
    await sharp(Buffer.from(svgStr), { density: 300 })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outPath);
    console.log(`✓ Rendered: ${filename} (${fs.statSync(outPath).size} bytes)`);
  }

  // Step 2: Upload to GCS using gcloud
  console.log('\n--- Uploading all rendered diagrams to gs://vigyanprep-diagrams ---');
  const cpCmd = `gcloud storage cp ${OUT_DIR}/*.png gs://${BUCKET}/`;
  const { stdout, stderr } = await execAsync(cpCmd);
  console.log(stdout || stderr);
  console.log('✓ Successfully uploaded all diagrams to Google Cloud Storage!');

  // Step 3: Update Supabase records
  console.log('\n--- Updating Supabase Questions with permanent GCS URLs ---');
  for (const filename of filenames) {
    const gcsUrl = `https://storage.googleapis.com/${BUCKET}/${filename}`;
    const relativeUrl = `/uploads/diagrams/${filename}`;

    const { data, error } = await supabase
      .from('questions')
      .update({ image_url: gcsUrl })
      .ilike('image_url', `%${filename}%`)
      .select('id, question_number, section, test_id');

    if (error) {
      console.error(`Failed to update ${filename}: `, error.message);
    } else {
      console.log(`✓ Updated ${data.length} questions for ${filename} -> ${gcsUrl}`);
    }
  }

  console.log('\n--- VERIFYING NO QUESTIONS REMAIN WITH /uploads/ ---');
  const { data: remaining } = await supabase
    .from('questions')
    .select('id, test_id, question_number, image_url')
    .ilike('image_url', '%/uploads/%');

  console.log(`Total questions remaining with /uploads/: ${remaining ? remaining.length : 0}`);
  if (remaining && remaining.length > 0) {
    console.log('Remaining:', remaining);
  } else {
    console.log('🎉 100% OF ALL QUESTIONS IN THE DATABASE NOW USE PERMANENT GCS HOSTING!');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
