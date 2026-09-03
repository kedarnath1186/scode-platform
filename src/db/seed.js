const bcrypt = require('bcryptjs');
const { dbRun, dbGet, dbAll, initDB } = require('./database');

const seedData = async () => {
  try {
    await initDB();

    // 1. Seed Admin User
    const existingAdmin = await dbGet('SELECT * FROM admin_users WHERE username = ?', ['admin']);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await dbRun(
        'INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@scode.in', passwordHash, 'superadmin']
      );
      console.log('Seeded default admin user: admin / admin123');
    }

    // 2. Seed Platform Settings
    const defaultSettings = [
      { key: 'platform_name', value: 'SCode' },
      { key: 'platform_tagline', value: 'Take Your Business Online with SCode' },
      { key: 'platform_description', value: 'Helping local businesses establish their online presence quickly and affordably. Get a professional business profile website without domain or hosting worries.' },
      { key: 'contact_email', value: 'contact@scode.in' },
      { key: 'contact_phone', value: '+919765975757' },
      { key: 'contact_whatsapp', value: '+919765975757' },
      { key: 'managed_by', value: 'SCode Digital Solutions' },
      { key: 'stat_businesses_count', value: '45+' },
      { key: 'stat_domain_hassle', value: '₹0' },
      { key: 'stat_setup_time', value: '24hr' }
    ];

    for (const s of defaultSettings) {
      await dbRun(
        'INSERT OR REPLACE INTO platform_settings (key, value) VALUES (?, ?)',
        [s.key, s.value]
      );
    }

    // 3. Seed Businesses
    const businesses = [
      {
        name: 'Clean Water Solutions',
        slug: 'clean-water-solutions',
        category: 'Water Treatment & AMC',
        tagline: 'Clean Water Initiative — 10+ Years of Water Treatment Excellence',
        description: 'Clean Water Solutions provides industrial, municipal, and residential water treatment services. 10+ years of expertise in RO systems, filtration, and AMC.',
        about_text: 'Clean Water Solutions has been at the forefront of water treatment technology since 2013. We specialize in providing comprehensive water and environmental solutions for industrial, municipal, and residential applications. Our team of expert engineers and technicians ensures that every project meets the highest standards of quality and efficiency. With over 500 successful projects and a commitment to innovation, we continue to lead the industry in sustainable water management solutions.',
        logo_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=1600&auto=format&fit=crop&q=80',
        phone: '+918796629663',
        whatsapp: '+918796629663',
        email: 'contact@cleanwatersolution.scode.in',
        address: 'Milkat No 48/1/137, Bhosari Gaothan, Landge Ali, Bhosari, Haveli, Pune 411039',
        google_map_url: 'https://maps.google.com/?q=Bhosari,Pune',
        status: 'live',
        expiry_date: '2027-03-31',
        theme_color: '#0ea5e9',
        is_featured: 1,
        services: [
          { title: 'Industrial Water Treatment', description: 'Comprehensive water treatment solutions for industrial & factory applications with advanced purification technology.', icon: 'bi-droplet-half', price: 'Custom Quote' },
          { title: 'Filtration & RO Systems', description: 'State-of-the-art filtration systems designed to remove impurities and ensure clean, safe water for all uses.', icon: 'bi-funnel-fill', price: 'Starting ₹15,000' },
          { title: 'Annual Maintenance Contracts (AMC)', description: 'Annual Maintenance Contracts to keep your water treatment systems running at peak performance year-round.', icon: 'bi-calendar-check-fill', price: 'From ₹4,999/yr' },
          { title: 'Environmental Water Consultancy', description: 'Expert consultancy services for water audits, system design, and compliance with environmental regulations.', icon: 'bi-patch-check-fill', price: 'Consultation' },
          { title: '24/7 Online IoT Monitoring', description: 'Real-time monitoring systems that provide 24/7 oversight of your water treatment operations remotely.', icon: 'bi-wifi', price: 'Add-on' }
        ],
        testimonials: [
          { client_name: 'Rajesh Kumar', client_role: 'Operations Director', company: 'ABC Industries Ltd.', quote: 'CWS transformed our industrial water system with their innovative RO technology. The efficiency gains have been remarkable, and their maintenance support is outstanding.', rating: 5 },
          { client_name: 'Priya Sharma', client_role: 'Facility Manager', company: 'XYZ Pharmaceuticals', quote: 'Excellent AMC service! Their team is always on time, professional, and ensures our water treatment plant runs smoothly with zero downtime.', rating: 5 },
          { client_name: 'Mohammed Ali', client_role: 'Public Health Engineer', company: 'City Water Department', quote: 'Our municipal RO plant has been running flawlessly for three years thanks to CWS. Their online monitoring gives complete peace of mind.', rating: 5 }
        ],
        gallery: [
          { title: 'Industrial RO Plant (5000 LPH)', image_url: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&auto=format&fit=crop&q=80', category: 'Industrial' },
          { title: 'Commercial Water Softener System', image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80', category: 'Commercial' },
          { title: 'Residential Multi-Stage Filtration', image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=800&auto=format&fit=crop&q=80', category: 'Residential' }
        ]
      },
      {
        name: 'Glory Computers',
        slug: 'glory-computers',
        category: 'Computer Business',
        tagline: 'Laptop and PC Repair in Hadapsar, Pune',
        description: 'Hands-on tech service for laptops, desktops, screen replacement, motherboard service, and genuine spare parts support.',
        about_text: 'Glory Computers is Hadapsar Pune’s premier computer sales and repair service center. With over 8 years in the hardware industry, our certified technicians repair laptops, build high-performance custom PCs, replace cracked screens, repair motherboards at chip level, and provide fast doorstep support for homes and small businesses.',
        logo_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
        phone: '+919822114455',
        whatsapp: '+919822114455',
        email: 'support@glorycomputers.scode.in',
        address: 'Shop No. 14, Near Magarpatta City Main Gate, Hadapsar, Pune 411028',
        google_map_url: 'https://maps.google.com/?q=Hadapsar,Pune',
        status: 'live',
        expiry_date: '2027-01-15',
        theme_color: '#3b82f6',
        is_featured: 1,
        services: [
          { title: 'Chip-Level Laptop Repair', description: 'Expert diagnosis and motherboard chip-level repair for Dell, HP, Lenovo, Asus, and Apple MacBooks.', icon: 'bi-laptop', price: 'Diagnosis ₹299' },
          { title: 'Screen & Keyboard Replacement', description: 'Original OEM screens, hinges, keyboards, and battery replacements with warranty.', icon: 'bi-display', price: 'Best Price' },
          { title: 'Custom Gaming & Editing PC Builds', description: 'Custom PC assembly tailored to your budget with optimal airflow and cable management.', icon: 'bi-cpu', price: 'Custom' },
          { title: 'Data Recovery & OS Installation', description: 'Corrupted hard drive recovery, SSD upgrades, Windows/Linux installation, and antivirus setup.', icon: 'bi-hdd-network', price: 'From ₹499' }
        ],
        testimonials: [
          { client_name: 'Aniket Deshmukh', client_role: 'Software Engineer', company: 'Tech Resident', quote: 'Fixed my dead gaming laptop motherboard within 24 hours when the official center quoted an exorbitant price. Super honest and knowledgeable!', rating: 5 },
          { client_name: 'Sneha Patil', client_role: 'Graphic Designer', company: 'Studio 9', quote: 'Upgraded my iMac SSD and RAM. Working like a brand new machine now. Fast service in Hadapsar!', rating: 5 }
        ],
        gallery: [
          { title: 'Chip-level BGA Repair Station', image_url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&auto=format&fit=crop&q=80', category: 'Repair' },
          { title: 'Custom Water-Cooled Rig', image_url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&auto=format&fit=crop&q=80', category: 'Builds' }
        ]
      },
      {
        name: 'SS Insurance Consultancy',
        slug: 'ss-insurance',
        category: 'Insurance Services',
        tagline: 'Your Trusted Insurance Partner in Maharashtra',
        description: 'Dependable insurance consultancy for life, health, motor, and business insurance with expert claim support and policy comparison.',
        about_text: 'SS Insurance Consultancy provides unbiased, personalized advisory on Life Insurance, Health Cover, Vehicle Insurance, and Commercial Enterprise Protection. With 12+ years of claims assistance and policy portfolio management, we ensure you and your family get maximum coverage with hassle-free claim settlements.',
        logo_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=1600&auto=format&fit=crop&q=80',
        phone: '+919876543210',
        whatsapp: '+919876543210',
        email: 'info@ssinsurance.scode.in',
        address: 'Office 204, City Vista, Kharadi, Pune 411014',
        google_map_url: 'https://maps.google.com/?q=Kharadi,Pune',
        status: 'live',
        expiry_date: '2027-06-30',
        theme_color: '#10b981',
        is_featured: 1,
        services: [
          { title: 'Comprehensive Health Insurance', description: 'Cashless hospitalization across 10,000+ top hospitals with no room rent capping and maternity coverage.', icon: 'bi-heart-pulse-fill', price: 'Free Consultation' },
          { title: 'Term Life & Critical Illness', description: 'Financial security for your family with guaranteed payouts and tax savings under 80C & 10(10D).', icon: 'bi-shield-check', price: 'Compare Plans' },
          { title: 'Motor & Commercial Vehicle', description: 'Zero-depreciation car and two-wheeler insurance with instant renewal and roadside assistance.', icon: 'bi-car-front-fill', price: 'Instant Renewal' },
          { title: 'End-to-End Claim Assistance', description: 'Dedicated assistance team walking you through every step of cashless claims and reimbursement paperwork.', icon: 'bi-file-earmark-medical', price: 'Included' }
        ],
        testimonials: [
          { client_name: 'Vikas Kulkarni', client_role: 'Business Owner', company: 'Kulkarni Enterprises', quote: 'SS Insurance handled my father’s emergency hospitalization claim effortlessly. The cashless approval came within 2 hours. Truly dependable!', rating: 5 }
        ],
        gallery: []
      },
      {
        name: 'Shriram Security Services',
        slug: 'shriram-security',
        category: 'Security Agencies',
        tagline: 'Professional Security & Facility Solutions in Pune',
        description: 'Pune-based provider of security and facility management with trained armed and unarmed guards, industrial and residential protection.',
        about_text: 'Shriram Security Services is a PSARA-licensed leading security and manpower agency. We deploy rigorously trained armed guards, corporate front-desk security, industrial watchmen, CCTV surveillance teams, and housekeeping staff across IT parks, residential townships, and factories.',
        logo_url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&auto=format&fit=crop&q=80',
        phone: '+919922334455',
        whatsapp: '+919922334455',
        email: 'contact@shriramsecurities.scode.in',
        address: 'Plot 55, MIDC Industrial Area, Bhosari, Pune 411026',
        google_map_url: 'https://maps.google.com/?q=MIDC,Bhosari,Pune',
        status: 'live',
        expiry_date: '2027-05-20',
        theme_color: '#f59e0b',
        is_featured: 1,
        services: [
          { title: 'Trained Industrial & Commercial Guards', description: 'PSARA certified 24/7 manned security for manufacturing plants, warehouses, and corporate offices.', icon: 'bi-shield-shaded', price: 'Monthly Contracts' },
          { title: 'Residential Society Security', description: 'Visitor gate management, perimeter patrolling, and automated log monitoring for housing societies.', icon: 'bi-buildings', price: 'Society Packages' },
          { title: 'VIP & Armed Guard Protection', description: 'Licensed armed personnel with tactical security training for high-profile transit and executive protection.', icon: 'bi-person-badge-fill', price: 'On Request' },
          { title: 'Facility & Housekeeping Services', description: 'Comprehensive integrated facility management, cleaning crews, and maintenance teams.', icon: 'bi-stars', price: 'Custom' }
        ],
        testimonials: [
          { client_name: 'Col. Arvind Shinde (Retd.)', client_role: 'Chairman', company: 'Ganga Platino Society', quote: 'Disciplined staff, strict visitor tracking, and responsive management. Shriram Security has transformed safety in our 300-flat society.', rating: 5 }
        ],
        gallery: []
      },
      {
        name: 'Omkar Computer & CCTV',
        slug: 'omkar-computer',
        category: 'Computer Business',
        tagline: 'Reliable Computer & CCTV Security Solutions in Pune',
        description: 'IT support with security-focused services — computer repair, CCTV installation, laptop sales, printer service, and data recovery.',
        about_text: 'Omkar Computer specializes in end-to-end IT infrastructure setup and surveillance systems for retail shops, offices, and homes. From Hikvision/CP Plus HD CCTV setups to multi-node networking and hardware repairs, we are your local one-stop tech partner.',
        logo_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&auto=format&fit=crop&q=80',
        phone: '+919860112233',
        whatsapp: '+919860112233',
        email: 'sales@omkarcomputer.scode.in',
        address: 'Shop 5, Guruwar Peth, Pune 411042',
        google_map_url: 'https://maps.google.com/?q=Guruwar+Peth,Pune',
        status: 'live',
        expiry_date: '2027-04-10',
        theme_color: '#8b5cf6',
        is_featured: 0,
        services: [
          { title: 'HD & IP CCTV Installation', description: 'Complete surveillance cameras setup with mobile live-view, night vision, and cloud storage.', icon: 'bi-camera-video-fill', price: 'Packages from ₹7,999' },
          { title: 'Office LAN & WiFi Networking', description: 'Structured Cat6 cabling, firewall configuration, mesh WiFi routers, and server rack management.', icon: 'bi-router-fill', price: 'Quote per point' },
          { title: 'Printer & Cartridge Refilling', description: 'Laser and inkjet printer servicing, toner refilling, and quick on-site maintenance.', icon: 'bi-printer-fill', price: 'From ₹250' }
        ],
        testimonials: [],
        gallery: []
      },
      {
        name: 'Kloudbox Technologies',
        slug: 'kloudbox',
        category: 'IT & Cloud Services',
        tagline: 'Cloud, ERP, AI, and Custom Application Solutions',
        description: 'Modern transformation partner for businesses adopting cloud services, ERP solutions, AI capabilities, and custom application development.',
        about_text: 'Kloudbox Technologies is a forward-thinking digital agency delivering robust SaaS platforms, customized ERP systems, cloud migration on AWS/Azure, and modern automation tools to scale growing enterprises.',
        logo_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
        phone: '+919988776655',
        whatsapp: '+919988776655',
        email: 'hello@kloudbox.scode.in',
        address: 'World Trade Center, Tower 2, Kharadi, Pune 411014',
        google_map_url: 'https://maps.google.com/?q=World+Trade+Center,Kharadi,Pune',
        status: 'live',
        expiry_date: '2027-12-31',
        theme_color: '#6366f1',
        is_featured: 1,
        services: [
          { title: 'Custom ERP & CRM Development', description: 'Tailored enterprise software to streamline inventory, sales, billing, and employee management.', icon: 'bi-diagram-3-fill', price: 'Enterprise Scope' },
          { title: 'Cloud Infrastructure & DevOps', description: 'AWS, Azure, and Google Cloud architecting with automated CI/CD pipelines and high availability.', icon: 'bi-cloud-check-fill', price: 'Monthly Retainer' },
          { title: 'AI & Business Automation', description: 'Custom AI chatbots, document parsing, and process automation to cut operational overhead.', icon: 'bi-robot', price: 'Custom Solution' }
        ],
        testimonials: [],
        gallery: []
      },
      {
        name: 'A.S. Enterprises',
        slug: 'as-enterprises',
        category: 'Battery & Solar Solutions',
        tagline: 'City Light Battery and Inverter Services',
        description: 'Local service business offering battery, inverter, and water purifier support with fast doorstep help for homes and businesses.',
        about_text: 'A.S. Enterprises is an authorized distributor and service partner for Exide, Luminous, and Amaron inverter batteries and domestic water purifiers. We provide 2-hour doorstep battery delivery, old battery exchange, and emergency breakdown assistance across Pune.',
        logo_url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1600&auto=format&fit=crop&q=80',
        phone: '+919822339900',
        whatsapp: '+919822339900',
        email: 'info@asenterprises.scode.in',
        address: 'Shop 8, Katraj-Kondhwa Road, Pune 411048',
        google_map_url: 'https://maps.google.com/?q=Katraj,Pune',
        status: 'live',
        expiry_date: '2027-02-28',
        theme_color: '#eab308',
        is_featured: 0,
        services: [
          { title: 'Inverter & Solar Battery Sales', description: 'Genuine batteries with manufacturer warranty and free doorstep installation.', icon: 'bi-battery-charging', price: 'Exchange Offers Available' },
          { title: 'Doorstep Battery Health Checkup', description: 'Quick electrolyte testing, load check, and inverter health inspection.', icon: 'bi-tools', price: '₹199 / Visit' }
        ],
        testimonials: [],
        gallery: []
      },
      {
        name: 'Shiv-Shambho Enterprises',
        slug: 'shiv-shambho-enterprises',
        category: 'Interior & Glass Work',
        tagline: 'Sliding Windows, Glass Work, and Interior Installations',
        description: 'Premium sliding windows and architectural glass services including partitions, shower enclosures, railings, and mirror work.',
        about_text: 'Shiv-Shambho Enterprises provides precision architectural aluminum sliding windows, soundproof UPVC windows, toughened glass office partitions, and designer stainless steel railings for villas, apartments, and corporate offices.',
        logo_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=80',
        phone: '+919765431122',
        whatsapp: '+919765431122',
        email: 'contact@shivshambho.scode.in',
        address: 'Survey 22, Near Sinhagad Road, Vadgaon Budruk, Pune 411041',
        google_map_url: 'https://maps.google.com/?q=Sinhagad+Road,Pune',
        status: 'live',
        expiry_date: '2027-07-31',
        theme_color: '#0284c7',
        is_featured: 0,
        services: [
          { title: 'Soundproof Aluminium Windows', description: 'Domals section 3-track sliding windows with mosquito mesh and acoustic sealing.', icon: 'bi-window', price: 'Per Sq.Ft Quote' },
          { title: 'Toughened Glass Office Partitions', description: 'Frameless 10mm & 12mm glass partitions with patch fittings and frosted films.', icon: 'bi-bounding-box-circles', price: 'On Inspection' }
        ],
        testimonials: [],
        gallery: []
      },
      {
        name: 'OM Enterprises Painting',
        slug: 'om-enterprises',
        category: 'Home Services & Painting',
        tagline: 'House Painting and Waterproofing Experts in Hadapsar',
        description: 'Specialist service provider for interior/exterior painting and waterproofing work in Hadapsar, Pune for residential and commercial projects.',
        about_text: 'OM Enterprises has beautified over 400+ homes and commercial spaces with Asian Paints and Berger certified application techniques. We specialize in terrace waterproofing, wall texture designs, and dust-free automated painting.',
        logo_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=1600&auto=format&fit=crop&q=80',
        phone: '+919890112244',
        whatsapp: '+919890112244',
        email: 'omenterprises@scode.in',
        address: 'Hadapsar Gaon, Pune 411028',
        google_map_url: 'https://maps.google.com/?q=Hadapsar,Pune',
        status: 'live',
        expiry_date: '2027-08-31',
        theme_color: '#ec4899',
        is_featured: 0,
        services: [
          { title: 'Interior & Exterior Painting', description: 'Premium Royal Luxury Emulsion painting with surface primer and crack filling.', icon: 'bi-paint-bucket', price: 'Free Site Estimate' },
          { title: 'Terrace & Bathroom Waterproofing', description: 'Polymer modified 3-coat waterproofing with 5-year leakage warranty.', icon: 'bi-droplet-fill', price: 'Warranty Included' }
        ],
        testimonials: [],
        gallery: []
      },
      {
        name: 'Chintamani Industries',
        slug: 'chintamani-industries',
        category: 'Manufacturing & Machinery',
        tagline: 'Crusher Machinery, Spare Parts, and Maintenance',
        description: 'Manufacturing for crusher industry machinery, stone crusher spare parts, manganese casting, and heavy maintenance services.',
        about_text: 'Chintamani Industries is an ISO-certified engineering and fabrication workshop delivering heavy-duty jaw crushers, cone crusher spare parts, conveyor belts, and vibrating screens for mining and quarrying projects across India.',
        logo_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1600&auto=format&fit=crop&q=80',
        phone: '+919822001188',
        whatsapp: '+919822001188',
        email: 'info@chintamaniindustries.scode.in',
        address: 'Chakan Industrial Phase 2, Pune 410501',
        google_map_url: 'https://maps.google.com/?q=Chakan,Pune',
        status: 'upcoming',
        expiry_date: '2027-10-31',
        theme_color: '#f97316',
        is_featured: 0,
        services: [
          { title: 'Stone Crusher Plant Fabrication', description: 'Complete turn-key stone crushing plant design and mechanical assembly.', icon: 'bi-gear-wide-connected', price: 'Project Based' },
          { title: 'Heavy Manganese Castings', description: 'Jaw plates, side liners, toggle plates, and blow bars with long operational life.', icon: 'bi-box-seam-fill', price: 'Catalog Available' }
        ],
        testimonials: [],
        gallery: []
      },
      {
        name: 'Vitech Systems',
        slug: 'vitech-systems',
        category: 'Automation & Hardware',
        tagline: 'A Business Website Launching Soon — Smart Automation',
        description: 'A digital presence in preparation — smart industrial IoT sensors, home automation switches, and embedded controllers.',
        about_text: 'Vitech Systems brings smart IoT automation products to modern homes, hotels, and industrial floors. Our next-generation wireless touch switches and sensor controllers are launching soon.',
        logo_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80',
        phone: '+919123456780',
        whatsapp: '+919123456780',
        email: 'info@vitechsystems.scode.in',
        address: 'Baner High Street, Pune 411045',
        google_map_url: 'https://maps.google.com/?q=Baner,Pune',
        status: 'upcoming',
        expiry_date: '2027-11-30',
        theme_color: '#06b6d4',
        is_featured: 0,
        services: [
          { title: 'Smart Touch Switches', description: 'Glass-panel WiFi & Zigbee capacitive touch switches controllable via smartphone & Alexa.', icon: 'bi-toggles', price: 'Launching Soon' }
        ],
        testimonials: [],
        gallery: []
      },
      {
        name: 'Madhuban Developers',
        slug: 'madhuban-developers',
        category: 'Real Estate & Plots',
        tagline: 'Land, Plotting, and Construction Services in Pune',
        description: 'Real estate and construction-focused business with clear title NA plots, gated farmhouse communities, and custom bungalow construction.',
        about_text: 'Madhuban Developers has been delivering collector-sanctioned NA bungalow plots, scenic hill-view farmhouses, and turn-key construction in Saswad, Bhor, and Lonavala with 100% legal title clearance and bank loan assistance.',
        logo_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=150&auto=format&fit=crop&q=80',
        hero_bg_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&auto=format&fit=crop&q=80',
        phone: '+919850123456',
        whatsapp: '+919850123456',
        email: 'sales@madhubandevelopers.scode.in',
        address: 'Office 102, Madhuban Landmark, FC Road, Pune 411005',
        google_map_url: 'https://maps.google.com/?q=FC+Road,Pune',
        status: 'upcoming',
        expiry_date: '2027-12-31',
        theme_color: '#14b8a6',
        is_featured: 0,
        services: [
          { title: 'Collector NA Villa Plots', description: 'Gated community with electricity, 30ft tar roads, clubhouse, and 24hr security.', icon: 'bi-geo-alt-fill', price: 'From ₹12 Lakhs' },
          { title: 'Turnkey Bungalow Construction', description: 'Architectural planning, 3D elevation, structural RCC construction, and interior turnkey delivery.', icon: 'bi-house-heart-fill', price: '₹1800/sq.ft' }
        ],
        testimonials: [],
        gallery: []
      }
    ];

    for (const b of businesses) {
      const existing = await dbGet('SELECT id FROM businesses WHERE slug = ?', [b.slug]);
      let businessId;

      if (!existing) {
        const result = await dbRun(`
          INSERT INTO businesses (
            name, slug, category, tagline, description, about_text,
            logo_url, hero_bg_url, phone, whatsapp, email, address,
            google_map_url, status, expiry_date, theme_color, is_featured
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          b.name, b.slug, b.category, b.tagline, b.description, b.about_text,
          b.logo_url, b.hero_bg_url, b.phone, b.whatsapp, b.email, b.address,
          b.google_map_url, b.status, b.expiry_date, b.theme_color, b.is_featured
        ]);
        businessId = result.lastID;
        console.log(`Seeded business: ${b.name} (ID: ${businessId})`);
      } else {
        businessId = existing.id;
      }

      // Seed services
      if (b.services && b.services.length > 0) {
        const existingServices = await dbAll('SELECT id FROM services WHERE business_id = ?', [businessId]);
        if (existingServices.length === 0) {
          for (let i = 0; i < b.services.length; i++) {
            const s = b.services[i];
            await dbRun(`
              INSERT INTO services (business_id, title, description, icon, price, display_order)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [businessId, s.title, s.description, s.icon, s.price, i + 1]);
          }
        }
      }

      // Seed testimonials
      if (b.testimonials && b.testimonials.length > 0) {
        const existingReviews = await dbAll('SELECT id FROM testimonials WHERE business_id = ?', [businessId]);
        if (existingReviews.length === 0) {
          for (const t of b.testimonials) {
            await dbRun(`
              INSERT INTO testimonials (business_id, client_name, client_role, company, quote, rating)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [businessId, t.client_name, t.client_role, t.company, t.quote, t.rating]);
          }
        }
      }

      // Seed gallery
      if (b.gallery && b.gallery.length > 0) {
        const existingGallery = await dbAll('SELECT id FROM gallery_items WHERE business_id = ?', [businessId]);
        if (existingGallery.length === 0) {
          for (const g of b.gallery) {
            await dbRun(`
              INSERT INTO gallery_items (business_id, title, image_url, category)
              VALUES (?, ?, ?, ?)
            `, [businessId, g.title, g.image_url, g.category]);
          }
        }
      }
    }

    // 4. Seed sample Users for Chatbot Search & User Management
    await dbRun('DELETE FROM users');

      // Fetch business IDs
      const cws = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['clean-water-solutions']);
      const glory = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['glory-computers']);
      const ssIns = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['ss-insurance']);
      const shriram = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['shriram-security']);
      const kloudbox = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['kloudbox']);
      const asEnt = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['as-enterprises']);
      const shivShambho = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['shiv-shambho-enterprises']);
      const omEnt = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['om-enterprises']);
      const chintamani = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['chintamani-industries']);
      const vitech = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['vitech-systems']);
      const madhuban = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['madhuban-developers']);

      // Update businesses with city, state, pincode, GST
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411039", gst_number = "27AAACC1234A1Z5" WHERE slug = "clean-water-solutions"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411028", gst_number = "27AAACG5678B1Z2" WHERE slug = "glory-computers"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411014", gst_number = "27AAACS9012C1Z8" WHERE slug = "ss-insurance"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411026", gst_number = "27AAACS3456D1Z1" WHERE slug = "shriram-security"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411014", gst_number = "27AAACK7890E1Z4" WHERE slug = "kloudbox"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411048", gst_number = "27AAACA1234F1Z7" WHERE slug = "as-enterprises"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411041", gst_number = "27AAACS4567G1Z9" WHERE slug = "shiv-shambho-enterprises"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411028", gst_number = "27AAACO8901H1Z3" WHERE slug = "om-enterprises"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "410501", gst_number = "27AAACC2345J1Z6" WHERE slug = "chintamani-industries"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411045", gst_number = "27AAACV6789K1Z0" WHERE slug = "vitech-systems"');
      await dbRun('UPDATE businesses SET city = "Pune", state = "Maharashtra", pincode = "411005", gst_number = "27AAACM0123L1Z4" WHERE slug = "madhuban-developers"');

      const sampleUsers = [
        { name: 'Rahul Kumar Patil', email: 'rahul@gmail.com', phone: '9876543210', city: 'Pune', state: 'Maharashtra', pincode: '411045', address: 'Baner Road, Pune 411045', gst_number: '27AAACP1234A1Z5', business_id: cws ? cws.id : null, role: 'business_owner', status: 'active' },
        { name: 'Rahul Sharma', email: 'rahul123@gmail.com', phone: '9822114455', city: 'Nashik', state: 'Maharashtra', pincode: '422001', address: 'College Road, Nashik 422001', gst_number: '27AABCS5678B1Z2', business_id: glory ? glory.id : null, role: 'business_owner', status: 'active' },
        { name: 'Rahul More', email: 'rahulmore@gmail.com', phone: '9890112244', city: 'Aurangabad', state: 'Maharashtra', pincode: '431001', address: 'CIDCO, Aurangabad 431001', gst_number: '27AABCM9012C1Z8', business_id: null, role: 'client', status: 'active' },
        { name: 'Kedarnath Shinde', email: 'kedarnath@scode.in', phone: '9765975757', city: 'Pune', state: 'Maharashtra', pincode: '411028', address: 'Hadapsar, Pune 411028', gst_number: '27AABCK3456D1Z1', business_id: kloudbox ? kloudbox.id : null, role: 'business_owner', status: 'active' },
        { name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '9876543211', city: 'Pune', state: 'Maharashtra', pincode: '411014', address: 'Viman Nagar, Pune 411014', gst_number: '27AABCP7890E1Z4', business_id: shivShambho ? shivShambho.id : null, role: 'business_owner', status: 'active' },
        { name: 'Anand Kulkarni', email: 'anand.k@example.com', phone: '9876543212', city: 'Bangalore', state: 'Karnataka', pincode: '560038', address: 'Indiranagar, Bangalore 560038', gst_number: '29AABCS1234F1Z7', business_id: ssIns ? ssIns.id : null, role: 'business_owner', status: 'active' },
        { name: 'Amit Deshmukh', email: 'amit.d@example.com', phone: '9876543213', city: 'Pune', state: 'Maharashtra', pincode: '411005', address: 'FC Road, Shivaji Nagar, Pune 411005', gst_number: '27AABCA4567G1Z9', business_id: chintamani ? chintamani.id : null, role: 'business_owner', status: 'active' },
        { name: 'Sneha Patil', email: 'sneha.p@example.com', phone: '9876543214', city: 'Nashik', state: 'Maharashtra', pincode: '422005', address: 'Indira Nagar, Nashik 422005', gst_number: '27AABCS8901H1Z3', business_id: omEnt ? omEnt.id : null, role: 'business_owner', status: 'active' },
        { name: 'Vikram Mehta', email: 'vikram.mehta@gmail.com', phone: '9811223344', city: 'Delhi', state: 'Delhi', pincode: '110001', address: 'Connaught Place, New Delhi 110001', gst_number: '07AABCM6789K1Z0', business_id: madhuban ? madhuban.id : null, role: 'business_owner', status: 'active' },
        { name: 'Sunil Shinde', email: 'sunil.shinde@gmail.com', phone: '9822554433', city: 'Pune', state: 'Maharashtra', pincode: '411026', address: 'Bhosari MIDC, Pune 411026', gst_number: '27AABCS0123L1Z4', business_id: shriram ? shriram.id : null, role: 'business_owner', status: 'active' },
        { name: 'Ramesh Gupta', email: 'ramesh.gupta@pharma.in', phone: '9844556677', city: 'Aurangabad', state: 'Maharashtra', pincode: '431005', address: 'Waluj MIDC, Aurangabad 431005', gst_number: '27AABCG3456M1Z8', business_id: null, role: 'client', status: 'active' },
        { name: 'Kavita Joshi', email: 'kavita.j@accounting.com', phone: '9866778899', city: 'Pune', state: 'Maharashtra', pincode: '411030', address: 'Sadashiv Peth, Pune 411030', gst_number: '27AABCJ7890N1Z2', business_id: null, role: 'client', status: 'active' }
      ];

      for (const u of sampleUsers) {
        const res = await dbRun(`
          INSERT INTO users (name, email, phone, city, state, pincode, address, gst_number, business_id, role, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [u.name, u.email, u.phone, u.city, u.state, u.pincode, u.address, u.gst_number, u.business_id, u.role, u.status]);

        if (u.business_id) {
          await dbRun('UPDATE businesses SET owner_id = ? WHERE id = ?', [res.lastID, u.business_id]);
        }
      }
      console.log(`Seeded ${sampleUsers.length} sample users linked with businesses into users table.`);

    // 5. Seed sample Leads / Inquiries
    await dbRun('DELETE FROM leads');
    const kloud = await dbGet('SELECT id FROM businesses WHERE slug = ?', ['kloudbox']);

    await dbRun(`
      INSERT INTO leads (business_id, name, email, phone, message, service_requested, status)
      VALUES 
        (?, 'Sunil Shinde', 'sunil.shinde@gmail.com', '+919822554433', 'Need quote for 2000 LPH RO water plant for our food processing unit in Bhosari MIDC.', 'Industrial Water Treatment', 'new'),
        (?, 'Mahesh Jagtap', 'mahesh.jagtap@outlook.com', '+919921445566', 'My Dell XPS 15 laptop has screen flickering and battery drain issue in Hadapsar.', 'Chip-Level Laptop Repair', 'contacted'),
        (?, 'Kavita Joshi', 'kavita.j@accounting.com', '+919866778899', 'Require Tally customization and accounting software integration for GST billing.', 'ERP & Cloud Accounting', 'new'),
        (?, 'Rahul Kumar Patil', 'rahul@gmail.com', '+919876543210', 'Looking for annual maintenance contract AMC renewal for industrial RO filtration plant.', 'Annual Maintenance Contracts (AMC)', 'contacted'),
        (NULL, 'Rohan Verma', 'rohan.v@gmail.com', '+919876112233', 'I want to build a profile website for my new Dental Clinic on SCode.', 'Website Setup', 'new')
    `, [cws ? cws.id : null, glory ? glory.id : null, kloud ? kloud.id : null, cws ? cws.id : null]);
    console.log('Seeded sample inquiries / leads');

    console.log('Database seeding finished successfully with SCode brand!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

if (require.main === module) {
  seedData().then(() => {
    process.exit(0);
  });
}

module.exports = { seedData };
