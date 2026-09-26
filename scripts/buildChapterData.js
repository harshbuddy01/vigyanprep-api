import fs from 'fs';

const IAT_CHAPTERS = {
  Mathematics: [
    {
      name: 'Sets, Relations & Functions',
      subTopics: [
        'Sets, Subsets & Venn Diagrams',
        'Types of Relations (Reflexive, Symmetric, Transitive, Equivalence)',
        'Domain, Range & Codomain of Functions',
        'Types of Functions (One-One, Onto, Bijective)',
        'Composite Functions & Inverse of a Function',
        'Piecewise Functions (Modulus, Greatest Integer, Fractional Part, Signum)'
      ]
    },
    {
      name: 'Complex Numbers',
      subTopics: [
        'Algebra of Complex Numbers & Modulus-Conjugate Properties',
        'Argand Plane & Polar / Euler Form',
        'Triangle Inequality & Geometric Locus',
        'De Moivre\'s Theorem & Applications',
        'Cube Roots & n-th Roots of Unity',
        'Rotation of Complex Numbers in Geometry'
      ]
    },
    {
      name: 'Quadratic Equations',
      subTopics: [
        'Nature of Roots & Discriminant Analysis',
        'Relation Between Roots and Coefficients (Vieta\'s Formulas)',
        'Common Roots Conditions & Transformation of Equations',
        'Location of Roots with Graph Analysis',
        'Quadratic Expressions, Sign Analysis & Range',
        'Maximum and Minimum of Quadratic Functions'
      ]
    },
    {
      name: 'Sequences & Series',
      subTopics: [
        'Arithmetic Progression (AP) & Properties',
        'Geometric Progression (GP) & Sum to Infinity',
        'Arithmetico-Geometric Progression (AGP)',
        'Special Series & Sigma Notation (Sum of n, n², n³)',
        'Telescoping Series & Method of Differences',
        'AM-GM-HM Inequalities and Applications'
      ]
    },
    {
      name: 'Permutations & Combinations',
      subTopics: [
        'Fundamental Principles of Counting (Addition & Multiplication)',
        'Permutations (Distinct & Identical Objects)',
        'Combinations & Selection Principles',
        'Circular Permutations & Restricted Arrangements',
        'Division into Groups & Distribution Problems',
        'Derangements & Multinomial Theorem Basics'
      ]
    },
    {
      name: 'Binomial Theorem',
      subTopics: [
        'Binomial Expansion for Positive Integral Index',
        'General Term, Middle Term & Greatest Term',
        'Properties of Binomial Coefficients & Series Summations',
        'Binomial Theorem for Any Rational Index & Approximations',
        'Multinomial Expansions & Remainder Problems'
      ]
    },
    {
      name: 'Matrices & Determinants',
      subTopics: [
        'Types of Matrices & Matrix Operations (Multiplication, Transpose)',
        'Symmetric, Skew-Symmetric & Orthogonal Matrices',
        'Properties of Determinants & Evaluation Techniques',
        'Adjoint & Inverse of a Square Matrix',
        'System of Linear Equations (Cramer\'s Rule & Matrix Inversion)',
        'Consistency & Rank Analysis of Linear Systems'
      ]
    },
    {
      name: 'Limits, Continuity & Differentiability',
      subTopics: [
        'Limits of Algebraic & Trigonometric Functions',
        'Indeterminate Forms & L\'Hôpital\'s Rule',
        'Standard Limit Formulas & Expansion Series',
        'Continuity of Functions & Types of Discontinuities',
        'Differentiability & Relation with Continuity',
        'Algebra of Differentiable Functions & Non-Differentiable Points'
      ]
    },
    {
      name: 'Differentiation',
      subTopics: [
        'Derivatives of Elementary Functions & First Principle',
        'Product Rule, Quotient Rule & Chain Rule',
        'Implicit Differentiation & Logarithmic Differentiation',
        'Parametric Differentiation & Higher Order Derivatives',
        'Differentiation of Inverse Trigonometric Functions'
      ]
    },
    {
      name: 'Applications of Derivatives (AOD)',
      subTopics: [
        'Rate of Change & Error Approximations',
        'Tangents and Normals to Curves',
        'Monotonicity (Increasing and Decreasing Functions)',
        'Rolle\'s Theorem & Lagrange\'s Mean Value Theorem (LMVT)',
        'Local and Absolute Maxima and Minima',
        'Concavity, Points of Inflection & Curve Sketching'
      ]
    },
    {
      name: 'Indefinite Integration',
      subTopics: [
        'Standard Integration Formulas & Algebraic Integrals',
        'Integration by Substitution (Trigonometric & Algebraic)',
        'Integration by Parts & Special Forms like e^x [f(x) + f\'(x)]',
        'Integration Using Partial Fractions',
        'Trigonometric Integrals (Powers of sin, cos, tan, sec)',
        'Irrational Integrals & Euler Substitutions'
      ]
    },
    {
      name: 'Definite Integration',
      subTopics: [
        'Definite Integral as Limit of a Sum (Riemann Sum)',
        'Fundamental Theorem of Calculus',
        'King\'s Property: ∫_a^b f(x)dx = ∫_a^b f(a+b-x)dx',
        'Queen\'s Property & Half-Interval Transformations',
        'Properties of Even, Odd & Periodic Functions in Integration',
        'Leibniz Rule for Differentiation Under Integral Sign',
        'Wallis\' Formula & Beta-Gamma Functions Basics'
      ]
    },
    {
      name: 'Differential Equations',
      subTopics: [
        'Order and Degree of Differential Equations',
        'Formation of Differential Equations',
        'Variable Separable Method & Reducible Forms',
        'Homogeneous Differential Equations',
        'First Order Linear Differential Equations (Integrating Factor)',
        'Exact Differential Equations & Orthogonal Trajectories'
      ]
    },
    {
      name: 'Area Under Curves',
      subTopics: [
        'Area Bounded by a Curve and Coordinate Axes',
        'Area Between Two Intersecting Curves',
        'Area Involving Modulus and Piecewise Curves',
        'Symmetry Considerations in Area Computation'
      ]
    },
    {
      name: 'Straight Lines & Pair of Lines',
      subTopics: [
        'Slope, Angle Between Lines & Collinearity',
        'Standard Forms of Equations of a Line',
        'Distance of a Point from a Line & Distance Between Parallel Lines',
        'Family of Lines & Intersection of Lines',
        'Homogeneous Equations & Pair of Straight Lines'
      ]
    },
    {
      name: 'Circles',
      subTopics: [
        'Standard and General Equation of a Circle',
        'Intercepts on Axes & Diametric Form',
        'Equation of Tangent, Normal & Condition of Tangency',
        'Chord of Contact, Polar & Director Circle',
        'Family of Circles & Radical Axis',
        'Common Tangents to Two Circles'
      ]
    },
    {
      name: 'Conic Sections (Parabola, Ellipse, Hyperbola)',
      subTopics: [
        'Parabola: Standard Equations, Focus, Directrix, Latus Rectum',
        'Parabola: Tangent, Normal, Focal Chords & Properties',
        'Ellipse: Standard Forms, Eccentricity, Directrices, Foci',
        'Ellipse: Tangents, Normals & Auxiliary Circle',
        'Hyperbola: Eccentricity, Foci, Asymptotes & Rectangular Hyperbola',
        'Conic Identification from General Second Degree Equation'
      ]
    },
    {
      name: 'Vector Algebra',
      subTopics: [
        'Types of Vectors, Position Vector & Direction Cosines/Ratios',
        'Addition of Vectors & Section Formula',
        'Scalar (Dot) Product & Orthogonality Conditions',
        'Vector (Cross) Product & Area of Triangle/Parallelogram',
        'Scalar Triple Product (Box Product) & Coplanarity',
        'Vector Triple Product & Lagrange\'s Identity'
      ]
    },
    {
      name: 'Three Dimensional Geometry',
      subTopics: [
        'Coordinates in 3D, Distance & Section Formulas',
        'Direction Cosines and Direction Ratios of a Line',
        'Equation of a Line in Vector and Cartesian Forms',
        'Angle Between Two Lines & Condition of Perpendicularity/Parallelism',
        'Shortest Distance Between Two Skew Lines & Line of Shortest Distance',
        'Equation of a Plane & Line-Plane Intersections'
      ]
    },
    {
      name: 'Probability & Statistics',
      subTopics: [
        'Measures of Central Tendency & Dispersion (Variance, Standard Deviation)',
        'Classical Definition & Axiomatic Probability',
        'Addition and Multiplication Theorems of Probability',
        'Conditional Probability & Independent Events',
        'Total Probability Theorem & Bayes\' Theorem',
        'Random Variables, Probability Distribution & Expectation',
        'Binomial Distribution (Mean and Variance)'
      ]
    }
  ],
  Chemistry: [
    {
      name: 'Some Basic Concepts of Chemistry (Mole Concept)',
      subTopics: [
        'Mole Concept & Molar Mass Calculations',
        'Empirical and Molecular Formula Determination',
        'Stoichiometry & Limiting Reagent in Chemical Reactions',
        'Concentration Terms (Molarity, Molality, Mole Fraction, ppm)',
        'Equivalent Weight & Law of Chemical Equivalence'
      ]
    },
    {
      name: 'Structure of Atom',
      subTopics: [
        'Bohr Model of Hydrogen Atom & Rydberg Equation',
        'Dual Nature of Matter & de Broglie Relation',
        'Heisenberg Uncertainty Principle',
        'Quantum Numbers (n, l, m, s) & Shapes of Orbitals',
        'Aufbau Principle, Pauli Exclusion Principle & Hund\'s Rule',
        'Electronic Configurations & Stability of Half/Fully-Filled Orbitals'
      ]
    },
    {
      name: 'Classification of Elements & Periodicity',
      subTopics: [
        'Modern Periodic Table & Electronic Configurations',
        'Periodic Trends in Atomic and Ionic Radii',
        'Ionization Enthalpy & Successive Ionization Energies',
        'Electron Gain Enthalpy & Electronegativity (Pauling Scale)',
        'Valency, Oxidation States & Anomalous Periodic Behaviors'
      ]
    },
    {
      name: 'Chemical Bonding & Molecular Structure',
      subTopics: [
        'Octet Rule, Formal Charge & Lewis Structures',
        'Ionic Bonding, Lattice Energy & Born-Haber Cycle',
        'VSEPR Theory & Prediction of Molecular Geometry',
        'Valence Bond Theory & Hybridization (sp, sp², sp³, sp³d, sp³d²)',
        'Molecular Orbital Theory (MOT), Bond Order & Magnetism (O₂, N₂)',
        'Dipole Moment, Molecular Polarity & Fajan\'s Rules',
        'Hydrogen Bonding (Inter & Intra) & Van der Waals Forces'
      ]
    },
    {
      name: 'Thermodynamics & Thermochemistry',
      subTopics: [
        'System, Surroundings, State Functions & Extensive/Intensive Properties',
        'First Law of Thermodynamics, Internal Energy & Work in Processes',
        'Enthalpy (H), Heat Capacity (Cp, Cv) & Relation (Cp - Cv = R)',
        'Hess\'s Law of Constant Heat Summation & Bond Enthalpies',
        'Entropy (S), Second Law of Thermodynamics & Criteria for Spontaneity',
        'Gibbs Free Energy (ΔG), Standard Free Energy & Equilibrium Constant'
      ]
    },
    {
      name: 'Chemical Equilibrium',
      subTopics: [
        'Law of Mass Action & Equilibrium Constants (Kc, Kp)',
        'Relationship Between Kp and Kc (Kp = Kc(RT)^Δn)',
        'Reaction Quotient (Qc) & Predicting Direction of Reaction',
        'Le Chatelier\'s Principle (Effect of Conc, Temp, Press, Inert Gas)',
        'Van \'t Hoff Equation & Temperature Dependence of K'
      ]
    },
    {
      name: 'Ionic Equilibrium',
      subTopics: [
        'Arrhenius, Brønsted-Lowry & Lewis Acid-Base Theories',
        'Ionization of Weak Acids and Bases (Ka, Kb)',
        'Ionic Product of Water (Kw) & pH Scale Calculations',
        'Common Ion Effect & Salt Hydrolysis (Acidic, Basic, Neutral Salts)',
        'Buffer Solutions (Acidic & Basic Buffers, Henderson Equation)',
        'Solubility Product (Ksp) & Applications in Precipitation'
      ]
    },
    {
      name: 'Redox Reactions & Electrochemistry',
      subTopics: [
        'Oxidation Number Rules & Balancing Redox Reactions',
        'Galvanic Cells, Standard Electrode Potentials & Series',
        'Nernst Equation for Cell Potential & Concentration Cells',
        'Gibbs Free Energy and Cell EMF (ΔG° = -nFE°cell)',
        'Electrolytic Cells & Faraday\'s Laws of Electrolysis',
        'Conductance of Solutions & Kohlrausch\'s Law of Independent Migration'
      ]
    },
    {
      name: 'Chemical Kinetics',
      subTopics: [
        'Rate of Reaction (Average and Instantaneous Rate)',
        'Rate Law, Order and Molecularity of Reaction',
        'Integrated Rate Equations for Zero, First Order Reactions',
        'Half-Life (t_1/2) of Zero and First Order Reactions',
        'Collision Theory of Reaction Rates',
        'Arrhenius Equation & Temperature Dependence (Activation Energy)'
      ]
    },
    {
      name: 'Solutions & Colligative Properties',
      subTopics: [
        'Types of Solutions & Henry\'s Law for Gas Solubility',
        'Raoult\'s Law for Volatile and Non-Volatile Solutes',
        'Ideal and Non-Ideal Solutions (Positive/Negative Deviations, Azeotropes)',
        'Relative Lowering of Vapour Pressure',
        'Elevation in Boiling Point & Depression in Freezing Point',
        'Osmotic Pressure & Reverse Osmosis',
        'Van \'t Hoff Factor (i) & Abnormal Molar Mass'
      ]
    },
    {
      name: 'Coordination Compounds',
      subTopics: [
        'Werner\'s Coordination Theory (Primary & Secondary Valencies)',
        'IUPAC Nomenclature of Coordination Complexes',
        'Isomerism in Coordination Compounds (Structural & Stereoisomerism)',
        'Valence Bond Theory (VBT) & Inner/Outer Orbital Complexes',
        'Crystal Field Theory (CFT): Octahedral & Tetrahedral Splitting, CFSE',
        'Spectrochemical Series, High-Spin & Low-Spin Complexes',
        'Magnetic Properties, Spin-Only Formula & Colour of Complexes'
      ]
    },
    {
      name: 'p-Block, d-Block & f-Block Elements',
      subTopics: [
        'Group 13 & 14 Elements (Boron, Carbon Families: Boranes, Allotropes)',
        'Group 15, 16, 17, 18 Elements (Nitrogen, Oxygen, Halogens, Noble Gases)',
        'd-Block Elements: Electronic Configurations, Variable Oxidation States',
        'Potassium Dichromate (K₂Cr₂O₇) & KMnO₄ Redox Chemistry',
        'Lanthanide Contraction and its Consequences'
      ]
    },
    {
      name: 'General Organic Chemistry (GOC)',
      subTopics: [
        'IUPAC Nomenclature of Polyfunctional Organic Compounds',
        'Structural Isomerism (Chain, Position, Functional, Metamerism, Tautomerism)',
        'Geometrical Isomerism (Cis-Trans, E-Z System, Stereoisomers Count)',
        'Optical Isomerism (Chirality, Enantiomers, Diastereomers, Meso, R-S)',
        'Inductive Effect (+I, -I) & Electron Displacement Effects',
        'Resonance & Mesomeric Effect (+M, -M), Hyperconjugation',
        'Aromaticity (Hückel\'s 4n+2 Rule, Anti-aromatic & Non-aromatic)',
        'Acidity and Basicity Orders of Organic Acids, Phenols, and Amines',
        'Reaction Intermediates: Carbocations, Carbanions, Free Radicals'
      ]
    },
    {
      name: 'Hydrocarbons (Alkanes, Alkenes, Alkynes, Arenes)',
      subTopics: [
        'Alkanes: Free Radical Halogenation & Wurtz Reaction',
        'Alkenes: Electrophilic Addition (Markovnikov & Anti-Markovnikov Rule)',
        'Hydroboration-Oxidation, Ozonolysis & Oxymercuration-Demercuration',
        'Alkynes: Acidity of Terminal Alkynes & Addition Reactions',
        'Aromatic Electrophilic Substitution (Nitration, Sulphonation, Friedel-Crafts)',
        'Directing Influence of Functional Groups in Benzene Rings'
      ]
    },
    {
      name: 'Haloalkanes & Haloarenes',
      subTopics: [
        'SN1 and SN2 Reaction Mechanisms (Stereochemistry, Solvents, Kinetics)',
        'Elimination Reactions (E1 and E2 Mechanisms, Saytzeff vs Hofmann)',
        'Reactions of Haloarenes & Nucleophilic Aromatic Substitution',
        'Grignard Reagent Preparation and Synthetic Applications'
      ]
    },
    {
      name: 'Alcohols, Phenols & Ethers',
      subTopics: [
        'Preparation & Distinction of 1°, 2°, 3° Alcohols (Lucas Test)',
        'Acid-Catalyzed Dehydration of Alcohols & Rearrangements',
        'Phenol: Acidity, Reimer-Tiemann Reaction, Kolbe\'s Reaction',
        'Electrophilic Substitution of Phenols (Bromination, Nitration)',
        'Ethers: Williamson Ether Synthesis & Cleavage with HI'
      ]
    },
    {
      name: 'Aldehydes, Ketones & Carboxylic Acids',
      subTopics: [
        'Nucleophilic Addition to Carbonyl Group (HCN, Grignard, Alcohols)',
        'Distinction Tests (Tollens\' Test, Fehling\'s Solution, Iodoform Reaction)',
        'Reactions Involving α-Hydrogens: Aldol & Cross-Aldol Condensation',
        'Cannizzaro Reaction & Cross-Cannizzaro Reaction',
        'Wolf-Kishner Reduction, Clemmensen Reduction & Rosenmund Reduction',
        'Acidity of Carboxylic Acids & Effects of Substituents',
        'HVZ Reaction (Hell-Volhard-Zelinsky) & Decarboxylation'
      ]
    },
    {
      name: 'Amines, Diazonium Salts & Biomolecules',
      subTopics: [
        'Classification & Basic Strength of Amines in Gas and Aqueous Phases',
        'Gabriel Phthalimide Synthesis & Hoffmann Bromamide Degradation',
        'Carbylamine Reaction & Hinsberg Test for Distinction of Amines',
        'Diazonium Salts: Preparation & Synthetic Reactions (Sandmeyer, Coupling)',
        'Carbohydrates: Monosaccharides (Glucose, Fructose), Epimers, Mutarotation',
        'Proteins: Amino Acids, Peptide Bond, Primary/Secondary/Tertiary Structures',
        'Nucleic Acids: DNA and RNA Structure, Nucleotides, Double Helix'
      ]
    }
  ],
  Physics: [
    {
      name: 'Units, Measurements & Error Analysis',
      subTopics: [
        'Dimensions of Physical Quantities & Dimensional Analysis',
        'Errors in Measurement (Absolute, Relative, Percentage Errors)',
        'Propagation of Errors in Algebraic Operations',
        'Significant Figures & Rounding Off Rules',
        'Vernier Calipers and Screw Gauge Principles'
      ]
    },
    {
      name: 'Motion in a Straight Line (1D Kinematics)',
      subTopics: [
        'Position, Distance, Displacement & Average / Instantaneous Velocity',
        'Uniform Acceleration & Kinematic Equations of Motion',
        'Motion Under Gravity (Vertical Projectile & Free Fall)',
        'Analysis of Graphs: x-t, v-t, and a-t Curves',
        'Relative Velocity in One Dimension'
      ]
    },
    {
      name: 'Motion in a Plane (2D Kinematics & Vectors)',
      subTopics: [
        'Vectors: Resolution, Addition & Relative Velocity in 2D',
        'Projectile Motion on Flat Ground (Range, Max Height, Flight Time)',
        'Projectile Motion on an Inclined Plane',
        'River-Boat Crossing Problems & Rain-Man Problems',
        'Uniform & Non-Uniform Circular Motion (Centripetal Acceleration)'
      ]
    },
    {
      name: 'Laws of Motion & Friction',
      subTopics: [
        'Newton\'s First, Second & Third Laws of Motion',
        'Free Body Diagrams & Constraint Equations (Pulleys, Wedges, Strings)',
        'Static, Kinetic & Rolling Friction, Angle of Repose & Friction',
        'Dynamics of Circular Motion (Banking of Roads, Conical Pendulum)',
        'Pseudo Forces in Non-Inertial Reference Frames'
      ]
    },
    {
      name: 'Work, Energy & Power',
      subTopics: [
        'Work Done by Constant and Variable Forces',
        'Work-Energy Theorem for a Particle and System',
        'Conservative and Non-Conservative Forces & Potential Energy',
        'Conservation of Mechanical Energy & Potential Energy Curves (U vs x)',
        'Motion in a Vertical Circle (Critical Velocities & String Tension)',
        'Power (Average and Instantaneous Power)'
      ]
    },
    {
      name: 'Center of Mass, Momentum & Collisions',
      subTopics: [
        'Center of Mass for Discrete and Continuous Mass Distributions',
        'Motion of Center of Mass & Conservation of Linear Momentum',
        'Impulse and Impulse-Momentum Theorem',
        'Elastic and Inelastic Collisions in 1D and 2D',
        'Coefficient of Restitution (e) & Oblique Collisions',
        'Variable Mass Systems & Rocket Propulsion'
      ]
    },
    {
      name: 'Rotational Motion',
      subTopics: [
        'Moment of Inertia of Continuous Bodies & Radius of Gyration',
        'Parallel and Perpendicular Axes Theorems',
        'Torque, Angular Acceleration & Newton\'s Second Law for Rotation',
        'Angular Momentum & Conservation of Angular Momentum',
        'Rotational Kinetic Energy & Work-Energy Theorem for Rotation',
        'Rolling Without Slipping on Horizontal and Inclined Planes',
        'Instantaneous Axis of Rotation (IAOR) & Top/Crown Forces'
      ]
    },
    {
      name: 'Gravitation',
      subTopics: [
        'Newton\'s Universal Law of Gravitation & Vector Form',
        'Acceleration Due to Gravity (g) & Variation with Altitude, Depth, Latitude',
        'Gravitational Field Intensity & Potential (Sphere, Shell)',
        'Gravitational Potential Energy & Escape Velocity',
        'Kepler\'s Laws of Planetary Motion (Orbital Velocity, Time Period)',
        'Geostationary and Polar Satellites'
      ]
    },
    {
      name: 'Mechanical Properties of Solids & Fluids',
      subTopics: [
        'Stress-Strain Curve, Hooke\'s Law & Moduli of Elasticity',
        'Elastic Potential Energy Stored in a Stretched Wire',
        'Hydrostatic Pressure, Pascal\'s Principle & Archimedes\' Principle',
        'Equation of Continuity & Bernoulli\'s Theorem (Torricelli, Venturimeter)',
        'Viscosity, Poiseuille\'s Formula & Stokes\' Law with Terminal Velocity',
        'Surface Tension, Surface Energy, Angle of Contact & Capillary Rise'
      ]
    },
    {
      name: 'Thermal Physics & Thermodynamics',
      subTopics: [
        'Thermal Expansion of Solids, Liquids, and Gases',
        'Calorimetry, Specific Heat Capacity & Latent Heat',
        'Heat Transfer: Conduction, Convection & Radiation (Wien, Stefan-Boltzmann)',
        'Ideal Gas Laws & Kinetic Theory of Gases (RMS, Mean Speeds)',
        'Degrees of Freedom, Equipartition of Energy & Specific Heats of Gases',
        'First Law of Thermodynamics (Work in Isothermal, Adiabatic Processes)',
        'Second Law of Thermodynamics, Heat Engines, Carnot Cycle & Efficiency'
      ]
    },
    {
      name: 'Oscillations (Simple Harmonic Motion)',
      subTopics: [
        'Kinematics of SHM (Displacement, Velocity, Acceleration, Phase)',
        'Energy in SHM (Kinetic and Potential Energy Oscillations)',
        'Spring-Mass Systems (Series and Parallel Combinations)',
        'Simple Pendulum, Physical Pendulum & Torsional Pendulum',
        'Damped and Driven Oscillations & Resonance'
      ]
    },
    {
      name: 'Waves & Sound',
      subTopics: [
        'Wave Equation, Transverse and Longitudinal Waves',
        'Speed of Transverse Waves in String & Sound Waves in Gases',
        'Superposition of Waves, Reflection of Waves & Phase Change',
        'Standing Waves in Stretched Strings & Organ Pipes (Harmonics)',
        'Beats Phenomenon & Beat Frequency Calculations',
        'Doppler Effect in Sound (Stationary/Moving Source and Observer)'
      ]
    },
    {
      name: 'Electrostatics (Charges, Field, Potential, Capacitance)',
      subTopics: [
        'Coulomb\'s Law, Principle of Superposition & Charge Distributions',
        'Electric Field Lines & Electric Flux',
        'Gauss\'s Law & Applications (Infinite Wire, Plane Sheet, Spherical Shell)',
        'Electric Potential & Potential Difference (Point Charge, Ring, Dipole)',
        'Relation Between Electric Field and Potential (E = -dV/dr)',
        'Electric Dipole in Uniform and Non-Uniform Electric Fields',
        'Capacitance, Parallel Plate Capacitor & Dielectrics (Polarization)',
        'Combination of Capacitors (Series/Parallel) & Energy Stored'
      ]
    },
    {
      name: 'Current Electricity',
      subTopics: [
        'Electric Current, Current Density & Drift Velocity of Electrons',
        'Ohm\'s Law, Electrical Resistance & Temperature Dependence',
        'EMF and Internal Resistance of a Cell, Series/Parallel Grouping',
        'Kirchhoff\'s Laws (KCL, KVL) & Circuit Analysis',
        'Wheatstone Bridge, Metre Bridge & Potentiometer Principles',
        'RC Transient Circuits (Charging and Discharging, Time Constant)'
      ]
    },
    {
      name: 'Magnetic Effects of Current & Magnetism',
      subTopics: [
        'Biot-Savart Law & Magnetic Field of a Straight Wire and Circular Loop',
        'Ampere\'s Circuital Law & Applications (Solenoid, Toroid)',
        'Lorentz Force on a Moving Charge, Helical Motion & Cyclotron',
        'Magnetic Force on a Current-Carrying Conductor & Parallel Currents',
        'Magnetic Dipole Moment of a Current Loop & Moving Coil Galvanometer',
        'Earth\'s Magnetism & Magnetic Materials (Dia, Para, Ferromagnetic)'
      ]
    },
    {
      name: 'Electromagnetic Induction & Alternating Currents',
      subTopics: [
        'Magnetic Flux, Faraday\'s Law of Induction & Lenz\'s Law',
        'Motional EMF in Straight and Rotating Conductors',
        'Self-Inductance, Mutual Inductance & RL Circuit Transients',
        'Alternating Current (Peak, RMS, and Average Values)',
        'AC Circuits: Pure R, L, C, and Series LCR Circuit (Phasor Diagrams)',
        'Resonance in LCR Circuits, Quality Factor (Q) & Power Factor',
        'Transformers & AC Generator Principles'
      ]
    },
    {
      name: 'Optics (Ray Optics & Wave Optics)',
      subTopics: [
        'Reflection at Spherical Mirrors & Mirror Formula',
        'Refraction at Plane Surfaces, Snell\'s Law & Total Internal Reflection',
        'Refraction at Spherical Surfaces, Lens Maker\'s & Thin Lens Formula',
        'Prism: Angle of Deviation, Minimum Deviation & Dispersion',
        'Optical Instruments (Simple & Compound Microscopes, Telescope)',
        'Huygens\' Principle & Wavefronts (Reflection and Refraction Proofs)',
        'Young\'s Double Slit Experiment (YDSE), Fringe Width & Path Difference',
        'Diffraction at a Single Slit & Polarization of Light (Brewster\'s Law)'
      ]
    },
    {
      name: 'Modern Physics & Semiconductors',
      subTopics: [
        'Photoelectric Effect, Einstein\'s Equation & Stopping Potential',
        'De Broglie Wavelength of Matter Waves & Davisson-Germer Experiment',
        'Bohr\'s Postulates, Energy Levels of Hydrogen Atom & Spectral Series',
        'Nuclear Composition, Mass Defect, Binding Energy & Fission/Fusion',
        'Radioactive Decay Law, Half-Life, Mean Life & Decay Modes',
        'Semiconductor Physics: Intrinsic & Extrinsic (p-type, n-type)',
        'p-n Junction Diode (Forward/Reverse Bias, V-I Characteristics)',
        'Rectifiers (Half-Wave, Full-Wave), Zener Diode Voltage Regulator'
      ]
    }
  ],
  Biology: [
    {
      name: 'Diversity in the Living World & Classification',
      subTopics: [
        'Characteristics of Living Beings & Taxonomic Hierarchy',
        'Binomial Nomenclature & Rules of Taxonomy',
        'Five Kingdom Classification (Monera, Protista, Fungi, Plantae, Animalia)',
        'Viruses, Viroids, Prions and Lichens'
      ]
    },
    {
      name: 'Plant Kingdom & Morphology',
      subTopics: [
        'Algae, Bryophytes, Pteridophytes, Gymnosperms and Angiosperms',
        'Plant Life Cycles & Alternation of Generations',
        'Morphology of Root, Stem, and Leaf (Modifications)',
        'Inflorescence, Flower Structure, Floral Formula & Fruit Types'
      ]
    },
    {
      name: 'Animal Kingdom & Structural Organisation',
      subTopics: [
        'Basis of Animal Classification (Coelom, Symmetry, Germ Layers)',
        'Non-Chordates (Porifera to Echinodermata & Hemichordata)',
        'Chordates (Cyclostomes, Fishes, Amphibia, Reptilia, Aves, Mammalia)',
        'Animal Tissues (Epithelial, Connective, Muscular, Neural)'
      ]
    },
    {
      name: 'Cell: The Unit of Life & Cell Division',
      subTopics: [
        'Prokaryotic vs Eukaryotic Cell Architecture',
        'Plasma Membrane (Fluid Mosaic Model) & Membrane Transport',
        'Endomembrane System (ER, Golgi, Lysosomes, Vacuoles)',
        'Mitochondria, Chloroplasts, Ribosomes, Cytoskeleton, Nucleus',
        'Cell Cycle: Interphase (G1, S, G2 phases)',
        'Mitosis (Prophase, Metaphase, Anaphase, Telophase, Cytokinesis)',
        'Meiosis I & Meiosis II (Synapsis, Crossing Over, Recombination)'
      ]
    },
    {
      name: 'Biomolecules & Enzymes',
      subTopics: [
        'Structure of Carbohydrates (Monosaccharides, Polysaccharides)',
        'Structure and Classification of Amino Acids & Proteins',
        'Lipids (Fatty Acids, Phospholipids, Triglycerides)',
        'Nucleotides, DNA, RNA Structure & B-DNA Properties',
        'Enzymes: Mechanism of Action, Activation Energy, Km Values',
        'Enzyme Inhibition (Competitive, Non-competitive, Allosteric)'
      ]
    },
    {
      name: 'Plant Physiology: Nutrition & Transport',
      subTopics: [
        'Plant Water Relations (Water Potential, Osmosis, Plasmolysis)',
        'Long-Distance Transport of Water: Cohesion-Tension Transpiration Pull',
        'Phloem Transport: Pressure Flow (Mass Flow) Hypothesis',
        'Essential Mineral Elements & Deficiency Symptoms',
        'Nitrogen Cycle & Biological Nitrogen Fixation (Nitrogenase Complex)'
      ]
    },
    {
      name: 'Plant Physiology: Photosynthesis & Respiration',
      subTopics: [
        'Chloroplast Pigments & Absorption / Action Spectra',
        'Light Reactions: Photosystem I & II, Photophosphorylation',
        'Chemiosmotic Hypothesis of ATP Synthesis',
        'Dark Reactions (Calvin Cycle / C3 Pathway)',
        'C4 Pathway (Kranz Anatomy, Hatch-Slack Pathway) & CAM Mechanism',
        'Photorespiration (C2 Cycle) & Factors Affecting Photosynthesis',
        'Glycolysis (EMP Pathway) & Fermentation',
        'Aerobic Respiration: Krebs Cycle (TCA Cycle) & Electron Transport Chain'
      ]
    },
    {
      name: 'Plant Growth and Hormones',
      subTopics: [
        'Growth Kinetics (Arithmetic and Geometric Growth)',
        'Auxins: Discovery, Physiological Effects & Applications',
        'Gibberellins: Stem Elongation, Bolting & Seed Germination',
        'Cytokinins: Cell Division, Apical Dominance Delay & Senescence',
        'Ethylene (Fruit Ripening) & Abscisic Acid (Stress Hormone)',
        'Photoperiodism (Short-Day, Long-Day Plants) & Vernalization'
      ]
    },
    {
      name: 'Human Physiology: Digestion, Breathing & Circulation',
      subTopics: [
        'Human Digestive System, Digestive Enzymes & Absorption Mechanisms',
        'Respiratory System, Mechanism of Breathing & Respiratory Volumes',
        'Gas Exchange & Transport of Oxygen and Carbon Dioxide',
        'Composition of Blood, Blood Groups (ABO, Rh) & Coagulation',
        'Human Heart Structure, Conducting System & Cardiac Cycle',
        'ECG Waves (P, QRS, T) & Double Circulation, Blood Pressure'
      ]
    },
    {
      name: 'Human Physiology: Excretion, Locomotion & Control',
      subTopics: [
        'Human Excretory System, Nephron Structure & Urine Formation',
        'Counter-Current Mechanism & Osmoregulation (ADH, RAAS)',
        'Types of Muscles, Structure of Myofibrils & Sliding Filament Theory',
        'Skeletal System (Axial and Appendicular Skeleton) & Joints',
        'Structure of a Neuron, Nerve Impulse Generation and Conduction',
        'Synaptic Transmission (Chemical and Electrical Synapses)',
        'Human Endocrine Glands & Hormones (Pituitary, Thyroid, Adrenal)',
        'Mechanism of Hormone Action (Peptide vs Steroid Hormones)'
      ]
    },
    {
      name: 'Reproduction & Development',
      subTopics: [
        'Male Reproductive System (Testes, Spermatogenesis, Hormones)',
        'Female Reproductive System (Ovaries, Oogenesis, Menstrual Cycle)',
        'Fertilization, Cleavage, Blastocyst Formation & Implantation',
        'Placenta Formation, Parturition and Lactation',
        'Flowering Plants: Microsporogenesis and Megasporogenesis',
        'Pollination Mechanisms, Double Fertilization & Seed Development'
      ]
    },
    {
      name: 'Genetics: Mendelian Inheritance & Molecular Biology',
      subTopics: [
        'Mendel\'s Laws of Inheritance (Dominance, Segregation, Assortment)',
        'Incomplete Dominance, Codominance & Multiple Alleles (ABO Group)',
        'Chromosomal Theory of Inheritance & Morgan\'s Linkage in Drosophila',
        'Sex Determination & Sex-Linked Disorders (Haemophilia, Colour Blindness)',
        'Evidence for DNA: Griffith, Avery-MacLeod, Hershey-Chase Experiments',
        'Semi-Conservative DNA Replication (Meselson-Stahl Experiment)',
        'Transcription in Prokaryotes and Eukaryotes (RNA Polymerases)',
        'Genetic Code Properties & Translation Mechanism',
        'Regulation of Gene Expression: Lac Operon Model',
        'Human Genome Project (HGP) & DNA Fingerprinting'
      ]
    },
    {
      name: 'Evolution & Human Health',
      subTopics: [
        'Origin of Life & Miller-Urey Experiment',
        'Evidences of Evolution (Homologous vs Analogous Organs)',
        'Darwinian Theory of Natural Selection & Modern Synthetic Theory',
        'Hardy-Weinberg Principle (Genetic Drift, Founder Effect)',
        'Adaptive Radiation & Speciation',
        'Common Human Pathogenic Diseases (Typhoid, Malaria, Ringworm)',
        'Innate and Acquired Immunity, Antibodies Structure, Vaccines',
        'AIDS (HIV Lifecycle) & Cancer (Oncogenes, Metastasis)'
      ]
    },
    {
      name: 'Biotechnology & Ecology',
      subTopics: [
        'Recombinant DNA Technology: Restriction Endonucleases, Vectors (pBR322)',
        'Polymerase Chain Reaction (PCR) Steps: Denaturation, Annealing, Extension',
        'Biotechnology Applications: Bt Cotton, RNAi, Insulin, Gene Therapy',
        'Organisms and Environment: Abiotic Factors, Adaptations',
        'Population Attributes: Growth Models (Exponential vs Logistic)',
        'Population Interactions: Mutualism, Parasitism, Predation, Competition',
        'Ecosystem: Energy Flow, Food Chains, Ecological Pyramids',
        'Biodiversity: Patterns, Hotspots, In-situ & Ex-situ Conservation'
      ]
    }
  ]
};

const ISI_CHAPTERS = {
  Mathematics: [
    {
      name: 'Algebra & Polynomials',
      subTopics: [
        'Quadratic Equations & Discriminant',
        'Polynomials & Factor Theorem',
        'Complex Numbers & Argand Plane',
        'Inequalities (AM-GM, Cauchy-Schwarz)',
        'Sequences & Series (AP, GP, Telescoping)',
        'Matrices & Determinants',
        'Systems of Linear Equations'
      ]
    },
    {
      name: 'Number Theory',
      subTopics: [
        'Divisibility & GCD/LCM',
        'Prime Numbers & Fundamental Theorem',
        'Modular Arithmetic & Congruences',
        'Diophantine Equations',
        'Euler\'s Totient & Fermat\'s Little Theorem',
        'Floor & Ceiling Functions'
      ]
    },
    {
      name: 'Combinatorics',
      subTopics: [
        'Permutations & Combinations',
        'Pigeonhole Principle',
        'Inclusion-Exclusion Principle',
        'Binomial Theorem & Identities',
        'Generating Functions',
        'Graph Theory Basics (Paths, Cycles, Trees)'
      ]
    },
    {
      name: 'Geometry & Trigonometry',
      subTopics: [
        'Triangles (Congruence, Similarity, Cevians)',
        'Circles (Power of a Point, Radical Axes)',
        'Coordinate Geometry (Lines, Conics)',
        'Trigonometric Identities & Equations',
        'Geometric Transformations',
        'Vectors in 2D & 3D'
      ]
    },
    {
      name: 'Calculus',
      subTopics: [
        'Limits & Continuity',
        'Differential Calculus (Derivatives, Rolle, MVT)',
        'Applications of Derivatives (Maxima, Minima, Curve Sketching)',
        'Integral Calculus (Techniques, Definite Integrals)',
        'Area Under Curves',
        'Ordinary Differential Equations (First Order)'
      ]
    },
    {
      name: 'Probability & Statistics',
      subTopics: [
        'Classical Probability & Counting',
        'Conditional Probability & Bayes Theorem',
        'Random Variables & Expectation',
        'Binomial & Poisson Distributions',
        'Descriptive Statistics (Mean, Variance, SD)'
      ]
    }
  ]
};

const CHAPTER_DATA = {
  iat: IAT_CHAPTERS,
  nest: IAT_CHAPTERS,
  isi: ISI_CHAPTERS
};

fs.writeFileSync('/Users/harshanand/Downloads/vigyanprep/api/src/controllers/chapterData.json', JSON.stringify(CHAPTER_DATA, null, 2));
console.log('Successfully generated chapterData.json');
