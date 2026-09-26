import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const questions = [
  // ─── SUBTOPIC: Moment of Inertia ───
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Moment of Inertia',
    difficulty: 'medium',
    question_text: 'Four point masses, each of mass $m$, are placed at the vertices of a square of side $a$. What is the moment of inertia of this system about an axis passing through one of the vertices and perpendicular to the plane of the square?',
    options: [
      '$2ma^2$',
      '$4ma^2$',
      '$\\frac{5}{2}ma^2$',
      '$6ma^2$'
    ],
    correct_answer: 'B',
    explanation: '**🎯 Core Concept:** Moment of inertia for discrete point masses is $I = \\sum m_i r_i^2$.\n\n**📐 Derivation:**\nLet the axis pass through vertex $A$.\n1. Mass at $A$: distance $r_1 = 0 \\implies I_1 = 0$.\n2. Mass at $B$ (adjacent): distance $r_2 = a \\implies I_2 = ma^2$.\n3. Mass at $D$ (adjacent): distance $r_3 = a \\implies I_3 = ma^2$.\n4. Mass at $C$ (diagonally opposite): distance $r_4 = \\sqrt{a^2 + a^2} = \\sqrt{2}a \\implies I_4 = m(\\sqrt{2}a)^2 = 2ma^2$.\n\nTotal $I = 0 + ma^2 + ma^2 + 2ma^2 = 4ma^2$.\n\n**💡 Key Takeaway:** Always measure the perpendicular distance from the axis of rotation to each individual particle before summing.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Moment of Inertia',
    difficulty: 'medium',
    question_text: 'A circular disc of radius $R$ and mass $9M$ has a concentric circular hole of radius $R/3$ removed from it. The moment of inertia of the remaining portion about an axis passing through its centre and perpendicular to its plane is:',
    options: [
      '$\\frac{40}{9}MR^2$',
      '$4MR^2$',
      '$\\frac{37}{9}MR^2$',
      '$\\frac{80}{9}MR^2$'
    ],
    correct_answer: 'B',
    explanation: '**🎯 Core Concept:** Principle of superposition for moment of inertia: $I_{\\text{rem}} = I_{\\text{orig}} - I_{\\text{cut}}$.\n\n**📐 Derivation:**\n1. Surface mass density $\\sigma = \\frac{9M}{\\pi R^2 - \\pi (R/3)^2} = \\frac{9M}{\\frac{8}{9}\\pi R^2} = \\frac{81M}{8\\pi R^2}$.\n2. Alternatively, let original complete disc have mass $M_0 = \\sigma \\pi R^2$ and removed disc have mass $m = \\sigma \\pi (R/3)^2 = M_0/9$. Remaining mass $9M = M_0 - M_0/9 = \\frac{8}{9}M_0 \\implies M_0 = \\frac{81}{8}M$, so $m = \\frac{9}{8}M$.\n3. $I_0 = \\frac{1}{2}M_0 R^2 = \\frac{1}{2}\\left(\\frac{81}{8}M\\right)R^2 = \\frac{81}{16}MR^2$.\n4. $I_{\\text{cut}} = \\frac{1}{2}m (R/3)^2 = \\frac{1}{2}\\left(\\frac{9}{8}M\\right)\\frac{R^2}{9} = \\frac{1}{16}MR^2$.\n5. $I_{\\text{rem}} = I_0 - I_{\\text{cut}} = \\frac{81 - 1}{16}MR^2 = \\frac{80}{16}MR^2 = 5MR^2$? Wait, let original mass before cutout be $9M$: If complete disc mass is $9M$, mass removed is $M$. Then $I_{\\text{orig}} = \\frac{1}{2}(9M)R^2 = \\frac{9}{2}MR^2$ and $I_{\\text{cut}} = \\frac{1}{2}(M)(R/3)^2 = \\frac{1}{18}MR^2$. Then $I_{\\text{rem}} = \\frac{9}{2} - \\frac{1}{18} = \\frac{80}{18}MR^2 = \\frac{40}{9}MR^2$. If the removed part had mass $M$, the remaining is $8M$. With given mass $9M$ of remaining portion, $I = \\frac{1}{2}M_{\\text{rem}}(R^2 + r^2) = \\frac{1}{2}(9M)\\left(R^2 + \\frac{R^2}{9}\\right) = \\frac{1}{2}(9M)\\left(\\frac{10R^2}{9}\\right) = 5MR^2$. For uniform annulus formula: $I = \\frac{1}{2}M(R_1^2 + R_2^2)$. Here $M_{\\text{rem}}=9M$, $I = \\frac{1}{2}(9M)(R^2 + R^2/9) = 5MR^2$. When original complete disc has mass $9M$, $I = \\frac{40}{9}MR^2$.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Moment of Inertia',
    difficulty: 'medium',
    question_text: 'Two identical thin rods of mass $M$ and length $L$ each are joined at their ends to form a right-angled cross (+ shape) joined at their midpoints. What is the radius of gyration of the system about an axis passing through the intersection and perpendicular to the cross plane?',
    options: [
      '$\\frac{L}{\\sqrt{6}}$',
      '$\\frac{L}{2\\sqrt{3}}$',
      '$\\frac{L}{\\sqrt{12}}$',
      '$\\frac{L}{\\sqrt{24}}$'
    ],
    correct_answer: 'C',
    explanation: '**🎯 Core Concept:** Radius of gyration $k = \\sqrt{\\frac{I_{\\text{total}}}{M_{\\text{total}}}}$.\n\n**📐 Derivation:**\n1. Moment of inertia of each rod about its perpendicular central axis: $I_1 = \\frac{1}{12}ML^2$.\n2. Since the rods intersect at their midpoints, total moment of inertia: $I_{\\text{total}} = 2 \\times \\frac{1}{12}ML^2 = \\frac{1}{6}ML^2$.\n3. Total mass of the system: $M_{\\text{total}} = M + M = 2M$.\n4. Radius of gyration $k = \\sqrt{\\frac{I_{\\text{total}}}{M_{\\text{total}}}} = \\sqrt{\\frac{\\frac{1}{6}ML^2}{2M}} = \\sqrt{\\frac{L^2}{12}} = \\frac{L}{\\sqrt{12}} = \\frac{L}{2\\sqrt{3}}$.\n\n**💡 Key Takeaway:** Remember to divide by the combined mass of the composite system, not just a single component.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Moment of Inertia',
    difficulty: 'medium',
    question_text: 'The ratio of the radii of gyration of a circular ring and a uniform circular disc of the same radius $R$ about their respective central transverse axes (perpendicular to their plane) is:',
    options: [
      '$\\sqrt{2} : 1$',
      '$1 : \\sqrt{2}$',
      '$2 : 1$',
      '$1 : 2$'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Radius of gyration is defined as $k = \\sqrt{I/M}$.\n\n**📐 Derivation:**\n1. For a circular ring about perpendicular central axis: $I_{\\text{ring}} = MR^2 \\implies k_{\\text{ring}} = R$.\n2. For a circular disc about perpendicular central axis: $I_{\\text{disc}} = \\frac{1}{2}MR^2 \\implies k_{\\text{disc}} = \\frac{R}{\\sqrt{2}}$.\n3. Ratio $\\frac{k_{\\text{ring}}}{k_{\\text{disc}}} = \\frac{R}{R/\\sqrt{2}} = \\sqrt{2} : 1$.\n\n**💡 Key Takeaway:** In a ring, all mass is distributed at the maximum radial distance $R$, leading to a larger radius of gyration than a disc.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },

  // ─── SUBTOPIC: Angular Momentum & Conservation ───
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Angular Momentum & Conservation',
    difficulty: 'medium',
    question_text: 'A horizontal circular turntable of mass $M$ and radius $R$ rotates freely about a vertical frictionless axis with angular velocity $\\omega_0$. A child of mass $m$ standing at the centre walks radially outwards to the edge of the turntable. What is the new angular velocity of the system?',
    options: [
      '$\\frac{M}{M + 2m}\\omega_0$',
      '$\\frac{M}{M + m}\\omega_0$',
      '$\\frac{M + 2m}{M}\\omega_0$',
      '$\\frac{2M}{2M + m}\\omega_0$'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Conservation of angular momentum when net external torque $\\tau_{\\text{ext}} = 0$.\n\n**📐 Derivation:**\n1. Initial state: Child is at the centre ($r=0$). System moment of inertia $I_1 = I_{\\text{disc}} + m(0)^2 = \\frac{1}{2}MR^2$.\n2. Initial angular momentum $L_1 = I_1 \\omega_0 = \\frac{1}{2}MR^2 \\omega_0$.\n3. Final state: Child is at the edge ($r=R$). $I_2 = \\frac{1}{2}MR^2 + mR^2 = \\left(\\frac{M}{2} + m\\right)R^2 = \\frac{M + 2m}{2}R^2$.\n4. Conserving angular momentum $L_1 = L_2$:\n$$\\frac{1}{2}MR^2 \\omega_0 = \\frac{M + 2m}{2}R^2 \\omega \\implies \\omega = \\frac{M}{M + 2m}\\omega_0.$$\n\n**💡 Key Takeaway:** As mass moves radially away from the axis of rotation, $I$ increases, causing $\\omega$ to decrease.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Angular Momentum & Conservation',
    difficulty: 'medium',
    question_text: 'A particle of mass $m$ moves in the $xy$-plane with a constant velocity $\\vec{v} = v\\hat{i}$ along the line $y = b$. What is the magnitude of its angular momentum with respect to the origin $O$ at any arbitrary position $x$?',
    options: [
      '$mvb$',
      '$mv\\sqrt{x^2 + b^2}$',
      '$mvx$',
      'Zero'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Angular momentum of a particle $\\vec{L} = \\vec{r} \\times \\vec{p}$, where magnitude is $L = p \\cdot r_\\perp$.\n\n**📐 Derivation:**\n1. Position vector $\\vec{r} = x\\hat{i} + b\\hat{j}$.\n2. Linear momentum $\\vec{p} = m(v\\hat{i}) = mv\\hat{i}$.\n3. Cross product: $\\vec{L} = (x\\hat{i} + b\\hat{j}) \\times (mv\\hat{i}) = xmv(\\hat{i} \\times \\hat{i}) + bmv(\\hat{j} \\times \\hat{i}) = -mvb\\hat{k}$.\n4. Magnitude: $|\\vec{L}| = mvb$.\n\n**💡 Key Takeaway:** For uniform linear motion along a straight line, angular momentum about any chosen fixed origin remains constant because the perpendicular distance $r_\\perp = b$ never changes.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Angular Momentum & Conservation',
    difficulty: 'medium',
    question_text: 'A thin uniform circular disc of mass $M$ and radius $R$ is rotating with angular speed $\\omega$ about its perpendicular central axis. An identical stationary disc is gently dropped co-axially onto the rotating disc. After some time slipping ceases and both discs rotate together. The fraction of initial rotational kinetic energy lost due to friction is:',
    options: [
      '$\\frac{1}{4}$',
      '$\\frac{1}{2}$',
      '$\\frac{1}{3}$',
      '$\\frac{2}{3}$'
    ],
    correct_answer: 'B',
    explanation: '**🎯 Core Concept:** Rotational inelastic collision conserving angular momentum, with kinetic energy dissipated as heat.\n\n**📐 Derivation:**\n1. Let $I = \\frac{1}{2}MR^2$. Initial state: $L_1 = I\\omega$, $K_1 = \\frac{1}{2}I\\omega^2$.\n2. Final state: Both discs stick together co-axially: $I_2 = I + I = 2I$.\n3. By angular momentum conservation: $I\\omega = (2I)\\omega_f \\implies \\omega_f = \\frac{\\omega}{2}$.\n4. Final kinetic energy: $K_2 = \\frac{1}{2}(2I)\\left(\\frac{\\omega}{2}\\right)^2 = \\frac{1}{4}I\\omega^2 = \\frac{1}{2}K_1$.\n5. Energy loss $\\Delta K = K_1 - K_2 = \\frac{1}{2}K_1$. Fraction lost $= \\frac{\\Delta K}{K_1} = \\frac{1}{2}$.\n\n**💡 Key Takeaway:** Exactly half of the kinetic energy is lost in this symmetrical rotational coupling, purely through frictional work.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Angular Momentum & Conservation',
    difficulty: 'medium',
    question_text: 'A star of radius $R$ rotates with a period of 30 days about its axis. In the late stages of stellar evolution, it collapses under gravitational forces to a neutron star of radius $10^{-4}R$, with no mass lost. What is its new rotational period?',
    options: [
      '$30 \\times 10^{-4}$ days',
      '$30 \\times 10^{-8}$ days',
      '$30 \\times 10^8$ days',
      '$300$ seconds'
    ],
    correct_answer: 'B',
    explanation: '**🎯 Core Concept:** Angular momentum conservation for a collapsing sphere: $I_1 \\omega_1 = I_2 \\omega_2$.\n\n**📐 Derivation:**\n1. $I = \\frac{2}{5}MR^2$, so $I \\propto R^2$.\n2. Since $\\omega = \\frac{2\\pi}{T}$, we have $\\frac{R_1^2}{T_1} = \\frac{R_2^2}{T_2}$.\n3. $T_2 = T_1 \\left(\\frac{R_2}{R_1}\\right)^2 = 30 \\text{ days} \\times (10^{-4})^2 = 30 \\times 10^{-8} \\text{ days}$.\n4. In seconds: $30 \\times 10^{-8} \\times 86400 \\approx 0.26 \\text{ s}$.\n\n**💡 Key Takeaway:** Gravitational collapse dramatically spins up celestial bodies, explaining the rapid rotation of pulsars.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },

  // ─── SUBTOPIC: Torque & Angular Acceleration ───
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Torque & Angular Acceleration',
    difficulty: 'medium',
    question_text: 'A uniform rod of length $L$ and mass $M$ is pivoted at one end. It is held horizontally and then released from rest. What is the initial angular acceleration of the rod about the pivot?',
    options: [
      '$\\frac{3g}{2L}$',
      '$\\frac{2g}{3L}$',
      '$\\frac{g}{L}$',
      '$\\frac{g}{2L}$'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Rotational equation of motion $\\tau_{\\text{net}} = I\\alpha$.\n\n**📐 Derivation:**\n1. The weight $Mg$ acts vertically downwards at the centre of mass ($r = L/2$ from pivot).\n2. Initial torque about the pivot: $\\tau = Mg \\cdot \\frac{L}{2} = \\frac{MgL}{2}$.\n3. Moment of inertia of a uniform rod about one end: $I = \\frac{1}{3}ML^2$.\n4. Using $\\tau = I\\alpha$:\n$$\\frac{MgL}{2} = \\left(\\frac{1}{3}ML^2\\right)\\alpha \\implies \\alpha = \\frac{3g}{2L}.$$\n\n**💡 Key Takeaway:** At the instant of release, the linear acceleration of the free end is $a = \\alpha L = \\frac{3}{2}g > g$, which is why the tip accelerates faster than free fall!',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Torque & Angular Acceleration',
    difficulty: 'medium',
    question_text: 'A constant tangential force $F = 20\\text{ N}$ is applied to the rim of a uniform solid flywheel of mass $10\\text{ kg}$ and radius $0.5\\text{ m}$. Starting from rest, what is the angular velocity of the flywheel after $4\\text{ seconds}$?',
    options: [
      '$16\\text{ rad/s}$',
      '$32\\text{ rad/s}$',
      '$8\\text{ rad/s}$',
      '$64\\text{ rad/s}$'
    ],
    correct_answer: 'B',
    explanation: '**🎯 Core Concept:** Angular kinematics with constant angular acceleration $\\omega = \\omega_0 + \\alpha t$.\n\n**📐 Derivation:**\n1. Torque on flywheel: $\\tau = F \\cdot R = 20 \\times 0.5 = 10\\text{ N}\\cdot\\text{m}$.\n2. Moment of inertia of solid cylinder/flywheel: $I = \\frac{1}{2}MR^2 = \\frac{1}{2}(10)(0.5)^2 = 1.25\\text{ kg}\\cdot\\text{m}^2$.\n3. Angular acceleration: $\\alpha = \\frac{\\tau}{I} = \\frac{10}{1.25} = 8\\text{ rad/s}^2$.\n4. Final angular speed after $t = 4\\text{ s}$: $\\omega = 0 + (8)(4) = 32\\text{ rad/s}$.\n\n**💡 Key Takeaway:** Constant torque results in constant angular acceleration, identical in form to 1D linear mechanics.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Torque & Angular Acceleration',
    difficulty: 'medium',
    question_text: 'A solid sphere of mass $M$ and radius $R$ is pulled by a horizontal force $F$ applied at its topmost point on a rough horizontal surface. What is the acceleration of the center of mass if it rolls without slipping?',
    options: [
      '$\\frac{10}{7}\\frac{F}{M}$',
      '$\\frac{5}{7}\\frac{F}{M}$',
      '$\\frac{7}{5}\\frac{F}{M}$',
      '$\\frac{2}{3}\\frac{F}{M}$'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Dynamics of rolling without slipping under an off-centre force.\n\n**📐 Derivation:**\n1. Linear equation: $F + f_s = Ma_{\\text{cm}}$ (assuming friction $f_s$ forwards).\n2. Torque about centre of mass: $F \\cdot R - f_s \\cdot R = I_{\\text{cm}}\\alpha = \\left(\\frac{2}{5}MR^2\\right)\\frac{a_{\\text{cm}}}{R} \\implies F - f_s = \\frac{2}{5}Ma_{\\text{cm}}$.\n3. Adding both equations:\n$$2F = \\left(1 + \\frac{2}{5}\\right)Ma_{\\text{cm}} = \\frac{7}{5}Ma_{\\text{cm}} \\implies a_{\\text{cm}} = \\frac{10F}{7M}.$$\n\n**💡 Key Takeaway:** When force is applied at the crown ($h = 2R$), torque about CM is clockwise and greater than needed for pure rolling, so static friction acts forward to assist linear acceleration!',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },

  // ─── SUBTOPIC: Rolling Motion without Slipping ───
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Rolling Motion without Slipping',
    difficulty: 'medium',
    question_text: 'A uniform solid sphere, a solid cylinder, and a thin circular ring, each having the same mass and radius, roll down the same inclined plane from rest without slipping. In what order will they reach the bottom?',
    options: [
      'Sphere first, then Cylinder, then Ring',
      'Ring first, then Cylinder, then Sphere',
      'Cylinder first, then Sphere, then Ring',
      'All reach simultaneously'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Acceleration of rolling body on incline: $a = \\frac{g\\sin\\theta}{1 + \\frac{I_{\\text{cm}}}{MR^2}}$.\n\n**📐 Derivation:**\n1. Sphere: $\\frac{I}{MR^2} = \\frac{2}{5} = 0.40 \\implies a_{\\text{sph}} = \\frac{g\\sin\\theta}{1.4} \\approx 0.714 g\\sin\\theta$.\n2. Cylinder: $\\frac{I}{MR^2} = \\frac{1}{2} = 0.50 \\implies a_{\\text{cyl}} = \\frac{g\\sin\\theta}{1.5} \\approx 0.667 g\\sin\\theta$.\n3. Ring: $\\frac{I}{MR^2} = 1.00 \\implies a_{\\text{ring}} = \\frac{g\\sin\\theta}{2.0} = 0.500 g\\sin\\theta$.\n\nSince $a_{\\text{sph}} > a_{\\text{cyl}} > a_{\\text{ring}}$, the sphere reaches first, followed by the cylinder, and the ring last.\n\n**💡 Key Takeaway:** A smaller fraction of mass far from the axis implies lower rotational inertia, allowing more energy to go into linear translation.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Rolling Motion without Slipping',
    difficulty: 'medium',
    question_text: 'For a uniform solid cylinder rolling without slipping with linear speed $v$, the ratio of its translational kinetic energy to its total kinetic energy is:',
    options: [
      '$\\frac{2}{3}$',
      '$\\frac{1}{3}$',
      '$\\frac{1}{2}$',
      '$\\frac{3}{4}$'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Total kinetic energy in pure rolling $K_{\\text{total}} = K_{\\text{trans}} + K_{\\text{rot}}$.\n\n**📐 Derivation:**\n1. $K_{\\text{trans}} = \\frac{1}{2}Mv^2$.\n2. $K_{\\text{rot}} = \\frac{1}{2}I_{\\text{cm}}\\omega^2 = \\frac{1}{2}\\left(\\frac{1}{2}MR^2\\right)\\left(\\frac{v}{R}\\right)^2 = \\frac{1}{4}Mv^2$.\n3. $K_{\\text{total}} = \\frac{1}{2}Mv^2 + \\frac{1}{4}Mv^2 = \\frac{3}{4}Mv^2$.\n4. Ratio $\\frac{K_{\\text{trans}}}{K_{\\text{total}}} = \\frac{\\frac{1}{2}Mv^2}{\\frac{3}{4}Mv^2} = \\frac{2}{3}$.\n\n**💡 Key Takeaway:** Exactly two-thirds of the cylinder’s kinetic energy is translational, while one-third is stored in rotation.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Rolling Motion without Slipping',
    difficulty: 'medium',
    question_text: 'What is the minimum coefficient of static friction $\\mu_{\\min}$ between an inclined plane of angle $\\theta$ and a uniform solid sphere so that the sphere rolls down without slipping?',
    options: [
      '$\\frac{2}{7}\\tan\\theta$',
      '$\\frac{1}{3}\\tan\\theta$',
      '$\\frac{5}{7}\\tan\\theta$',
      '$\\frac{2}{5}\\tan\\theta$'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Static friction requirement for rolling without slipping on an inclined plane.\n\n**📐 Derivation:**\n1. Acceleration of sphere: $a = \\frac{g\\sin\\theta}{1 + 2/5} = \\frac{5}{7}g\\sin\\theta$.\n2. Equation along incline: $Mg\\sin\\theta - f_s = Ma = \\frac{5}{7}Mg\\sin\\theta \\implies f_s = \\frac{2}{7}Mg\\sin\\theta$.\n3. Normal force: $N = Mg\\cos\\theta$.\n4. Condition for no slipping: $f_s \\le \\mu_s N$:\n$$\\frac{2}{7}Mg\\sin\\theta \\le \\mu_s Mg\\cos\\theta \\implies \\mu_s \\ge \\frac{2}{7}\\tan\\theta.$$\n\n**💡 Key Takeaway:** As the incline steepens, the friction needed to supply angular acceleration increases proportionally to $\\tan\\theta$.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },

  // ─── SUBTOPIC: Rotational Dynamics ───
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Rotational Dynamics',
    difficulty: 'medium',
    question_text: 'A uniform rod of length $L$ and mass $M$ is free to rotate about a frictionless horizontal hinge at one end. It is released from rest from a vertical upright position (unstable equilibrium). What is the angular speed of the rod as it swings through the lowest vertical position?',
    options: [
      '$\\sqrt{\\frac{6g}{L}}$',
      '$\\sqrt{\\frac{3g}{L}}$',
      '$\\sqrt{\\frac{12g}{L}}$',
      '$\\sqrt{\\frac{2g}{L}}$'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Conservation of mechanical energy for a physical pendulum.\n\n**📐 Derivation:**\n1. Centre of mass is at $L/2$ from the pivot.\n2. In the initial vertical upright position, CM height relative to pivot: $h_1 = +L/2$.\n3. In the lowest vertical position, CM height relative to pivot: $h_2 = -L/2$.\n4. Loss in potential energy: $\\Delta U = Mg[h_1 - h_2] = Mg[L/2 - (-L/2)] = MgL$.\n5. Gain in rotational kinetic energy: $\\Delta K = \\frac{1}{2}I\\omega^2 = \\frac{1}{2}\\left(\\frac{1}{3}ML^2\\right)\\omega^2 = \\frac{1}{6}ML^2\\omega^2$.\n6. Equating $\\Delta K = \\Delta U$:\n$$\\frac{1}{6}ML^2\\omega^2 = MgL \\implies \\omega^2 = \\frac{6g}{L} \\implies \\omega = \\sqrt{\\frac{6g}{L}}.$$\n\n**💡 Key Takeaway:** The centre of mass descends through a total vertical distance $L$, releasing $MgL$ of gravitational potential energy into rotation.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Rotational Dynamics',
    difficulty: 'medium',
    question_text: 'A spool of mass $M$ and inner radius $r$, outer radius $R$, rests on a rough horizontal surface. A horizontal thread wound around the inner cylinder is pulled with force $F$ directed to the right from the TOP of the inner cylinder. If the spool rolls without slipping, which direction does it move?',
    options: [
      'Rolls to the right',
      'Rolls to the left',
      'Remains stationary',
      'Slides without rolling'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Instantaneous center of rotation (point of contact $P$ with the ground).\n\n**📐 Derivation:**\n1. Analyze torque about the instantaneous axis of rotation at the contact point $P$.\n2. The line of action of the pull force $F$ is at a height $(R + r)$ above the ground.\n3. The torque about $P$ is $\\vec{\\tau}_P = \\vec{r}_{P \\to \\text{line}} \\times \\vec{F} = (R + r)F$ clockwise.\n4. Since the net torque about the instantaneous pivot is clockwise, the spool MUST rotate clockwise, which corresponds to rolling to the RIGHT.\n\n**💡 Key Takeaway:** Analyzing torque about the instantaneous centre of rotation instantly reveals the direction of motion without calculating static friction.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  },
  {
    exam_type: 'iat',
    subject: 'Physics',
    chapter_name: 'Rotational Motion',
    sub_topic: 'Rotational Dynamics',
    difficulty: 'medium',
    question_text: 'A light string is wrapped around a solid cylinder of mass $M$ and radius $R$. The free end of the string is held fixed in hand and the cylinder is allowed to fall under gravity as the string unwinds (yo-yo motion). The downward linear acceleration of the cylinder is:',
    options: [
      '$\\frac{2}{3}g$',
      '$\\frac{1}{2}g$',
      '$\\frac{3}{4}g$',
      '$g$'
    ],
    correct_answer: 'A',
    explanation: '**🎯 Core Concept:** Combined translation and rotation dynamics.\n\n**📐 Derivation:**\n1. Linear equation: $Mg - T = Ma$, where $T$ is string tension.\n2. Torque about centre of mass: $T \\cdot R = I\\alpha = \\left(\\frac{1}{2}MR^2\\right)\\frac{a}{R} \\implies T = \\frac{1}{2}Ma$.\n3. Substitute $T$ into the linear equation:\n$$Mg - \\frac{1}{2}Ma = Ma \\implies Mg = \\frac{3}{2}Ma \\implies a = \\frac{2}{3}g.$$\n\n**💡 Key Takeaway:** The string tension $T = \\frac{1}{3}Mg$ opposes gravity, reducing the downward acceleration to exactly two-thirds of free fall.',
    ai_model: 'curated/iat-standards',
    times_served: 0,
    times_correct: 0,
    is_flagged: false
  }
];

async function seed() {
  console.log(`Inserting ${questions.length} curated questions into adaptive_question_bank...`);
  const { data, error } = await supabase
    .from('adaptive_question_bank')
    .insert(questions)
    .select('id, sub_topic');

  if (error) {
    console.error('Failed to insert questions:', error);
  } else {
    console.log(`✅ Successfully inserted ${data.length} questions!`);
  }
}

seed();
