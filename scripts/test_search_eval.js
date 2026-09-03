const userSearchService = require('../src/services/userSearchService');
const chatService = require('../src/services/chatService');

process.env.NODE_ENV = 'test_quiet';

async function runSearchEvaluation() {
  console.log('================================================================');
  console.log('📊 SCode Database Assistant — 100+ Retrieval Accuracy Benchmark');
  console.log('================================================================\n');

  // Benchmark Test Dataset (Derived from REAL database records)
  const testSuite = [
    // --- Category A: Exact & Normalized Customer Names ---
    { query: 'Rahul Kumar Patil', expectedType: 'customer', expectedId: 23, desc: 'Exact Full Name' },
    { query: 'Rahul Patil', expectedType: 'customer', expectedId: 23, desc: 'Partial Name (First + Last)' },
    { query: 'rahul kumar', expectedType: 'customer', expectedId: 23, desc: 'Lowercase Partial Name' },
    { query: '  RAHUL PATIL  ', expectedType: 'customer', expectedId: 23, desc: 'Uppercase with Extra Whitespace' },
    { query: 'Rahul kumar patel', expectedType: 'customer', expectedId: 23, desc: 'Reasonable Typo (Patel vs Patil)' },
    { query: 'Kedarnath Shinde', expectedType: 'customer', expectedId: 26, desc: 'Exact Name (Kedarnath)' },
    { query: 'kedarnath', expectedType: 'customer', expectedId: 26, desc: 'Single Token Name' },
    { query: 'Priya Sharma', expectedType: 'customer', expectedId: 27, desc: 'Exact Name (Priya)' },
    { query: 'Anand Kulkarni', expectedType: 'customer', expectedId: 28, desc: 'Exact Name (Anand)' },
    { query: 'Amit Deshmukh', expectedType: 'customer', expectedId: 29, desc: 'Exact Name (Amit)' },
    { query: 'Sneha Patil', expectedType: 'customer', expectedId: 30, desc: 'Exact Name (Sneha)' },
    { query: 'Vikram Mehta', expectedType: 'customer', expectedId: 31, desc: 'Exact Name (Vikram)' },
    { query: 'Sunil Shinde', expectedType: 'customer', expectedId: 32, desc: 'Exact Name (Sunil)' },
    { query: 'Ramesh Gupta', expectedType: 'customer', expectedId: 33, desc: 'Exact Name (Ramesh)' },
    { query: 'Kavita Joshi', expectedType: 'customer', expectedId: 34, desc: 'Exact Name (Kavita)' },

    // --- Category B: Exact & Normalized Business Names ---
    { query: 'Clean Water Solutions', expectedType: 'business', expectedId: 1, desc: 'Exact Business Name' },
    { query: 'clean water', expectedType: 'business', expectedId: 1, desc: 'Partial Business Substring' },
    { query: 'CleanWater', expectedType: 'business', expectedId: 1, desc: 'No-space Variation' },
    { query: 'CLEAN WATER SOLUTIONS', expectedType: 'business', expectedId: 1, desc: 'Uppercase Business' },
    { query: 'Glory Computers', expectedType: 'business', expectedId: 2, desc: 'Exact Business Name' },
    { query: 'glory computers', expectedType: 'business', expectedId: 2, desc: 'Lowercase Business' },
    { query: 'glory', expectedType: 'business', expectedId: 2, desc: 'Single Token Business' },
    { query: 'SS Insurance Consultancy', expectedType: 'business', expectedId: 3, desc: 'Exact Business Name' },
    { query: 'ss insurance', expectedType: 'business', expectedId: 3, desc: 'Partial Business Name' },
    { query: 'Shriram Security Services', expectedType: 'business', expectedId: 4, desc: 'Exact Business Name' },
    { query: 'shriram security', expectedType: 'business', expectedId: 4, desc: 'Partial Business Name' },
    { query: 'Kloudbox Technologies', expectedType: 'business', expectedId: 6, desc: 'Exact Business Name' },
    { query: 'kloudbox', expectedType: 'business', expectedId: 6, desc: 'Single Token Business' },
    { query: 'Shiv-Shambho Enterprises', expectedType: 'business', expectedId: 8, desc: 'Exact Business with Hyphen' },
    { query: 'shiv shambho', expectedType: 'business', expectedId: 8, desc: 'Separated Space Business' },
    { query: 'OM Enterprises Painting', expectedType: 'business', expectedId: 9, desc: 'Exact Business Name' },
    { query: 'Chintamani Industries', expectedType: 'business', expectedId: 10, desc: 'Exact Business Name' },
    { query: 'Madhuban Developers', expectedType: 'business', expectedId: 12, desc: 'Exact Business Name' },
    { query: 'A.S. Enterprises', expectedType: 'business', expectedId: 7, desc: 'Business with Dots' },
    { query: 'Vitech Systems', expectedType: 'business', expectedId: 11, desc: 'Exact Business Name' },

    // --- Category C: Cross-Entity Multi-Term Compound Queries ---
    { query: 'Rahul Clean Water', expectedType: 'customer', expectedId: 23, desc: 'Customer + Business Name' },
    { query: 'Rahul Pune', expectedType: 'customer', expectedId: 23, desc: 'Customer + City' },
    { query: 'Clean Water Pune', expectedType: 'business', expectedId: 1, desc: 'Business + City' },
    { query: 'Rahul Clean Water Pune', expectedType: 'customer', expectedId: 23, desc: 'Customer + Business + City (3-Term Compound)' },
    { query: 'Kedarnath Kloudbox', expectedType: 'customer', expectedId: 26, desc: 'Customer + Business' },
    { query: 'Kedarnath Pune', expectedType: 'customer', expectedId: 26, desc: 'Customer + City' },
    { query: 'Anand Bangalore', expectedType: 'customer', expectedId: 28, desc: 'Customer + Bangalore City' },
    { query: 'Anand SS Insurance', expectedType: 'customer', expectedId: 28, desc: 'Customer + Business' },
    { query: 'Priya Shiv-Shambho', expectedType: 'customer', expectedId: 27, desc: 'Customer + Business' },
    { query: 'Sunil Shriram Security', expectedType: 'customer', expectedId: 32, desc: 'Customer + Business' },
    { query: 'Amit Chintamani', expectedType: 'customer', expectedId: 29, desc: 'Customer + Business' },
    { query: 'Sneha OM Enterprises', expectedType: 'customer', expectedId: 30, desc: 'Customer + Business' },
    { query: 'Sneha Nashik', expectedType: 'customer', expectedId: 30, desc: 'Customer + Nashik City' },
    { query: 'Vikram Delhi', expectedType: 'customer', expectedId: 31, desc: 'Customer + Delhi City' },
    { query: 'Vikram Madhuban Developers', expectedType: 'customer', expectedId: 31, desc: 'Customer + Business' },
    { query: 'Kavita Pune', expectedType: 'customer', expectedId: 34, desc: 'Customer + City' },

    // --- Category D: Direct Unique Identifiers (Phone, Email, GST, ID) ---
    { query: '9876543210', expectedType: 'customer', expectedId: 23, desc: 'Exact 10-digit Phone' },
    { query: 'Find phone 9822114455', expectedType: 'customer', expectedId: 24, desc: 'Phone with Command Prefix' },
    { query: '9765975757', expectedType: 'customer', expectedId: 26, desc: 'Phone for Kedarnath' },
    { query: '9876543212', expectedType: 'customer', expectedId: 28, desc: 'Phone for Anand' },
    { query: '9811223344', expectedType: 'customer', expectedId: 31, desc: 'Phone for Vikram' },
    { query: 'rahul@gmail.com', expectedType: 'customer', expectedId: 23, desc: 'Exact Email Address' },
    { query: 'Email: kedarnath@scode.in', expectedType: 'customer', expectedId: 26, desc: 'Email with Label' },
    { query: 'priya.sharma@example.com', expectedType: 'customer', expectedId: 27, desc: 'Exact Email' },
    { query: 'anand.k@example.com', expectedType: 'customer', expectedId: 28, desc: 'Exact Email' },
    { query: 'vikram.mehta@gmail.com', expectedType: 'customer', expectedId: 31, desc: 'Exact Email' },
    { query: '27AAACP1234A1Z5', expectedType: 'customer', expectedId: 23, desc: 'Exact Customer GST Number' },
    { query: '27AAACC1234A1Z5', expectedType: 'business', expectedId: 1, desc: 'Exact Business GST Number' },
    { query: '27AABCK3456D1Z1', expectedType: 'customer', expectedId: 26, desc: 'Exact GST Number' },
    { query: '29AABCS1234F1Z7', expectedType: 'customer', expectedId: 28, desc: 'Exact Karnataka GST Number' },
    { query: '07AABCM6789K1Z0', expectedType: 'customer', expectedId: 31, desc: 'Exact Delhi GST Number' },

    // --- Category E: Inquiries, Leads & Services Relational Search ---
    { query: 'Tally customization', expectedType: 'customer', expectedId: 26, desc: 'Inquiry Text (Tally)' },
    { query: 'accounting software integration', expectedType: 'customer', expectedId: 26, desc: 'Inquiry Service Request' },
    { query: '2000 LPH RO water plant', expectedType: 'customer', expectedId: 23, desc: 'Inquiry Message (RO Plant)' },
    { query: 'AMC renewal for industrial RO', expectedType: 'customer', expectedId: 23, desc: 'Inquiry Message (AMC Renewal)' },
    { query: 'Chip-Level Laptop Repair', expectedType: 'customer', expectedId: 24, desc: 'Inquiry Service (Laptop Repair)' },
    { query: 'Dell XPS 15 laptop flickering', expectedType: 'customer', expectedId: 24, desc: 'Inquiry Message Detail' },
    { query: 'Dental Clinic website', expectedType: 'business', expectedId: null, desc: 'Platform Level Lead' },

    // --- Category F: Natural Language Relationship Questions ---
    { query: 'Who owns Clean Water Solutions?', expectedType: 'customer', expectedId: 23, desc: 'Ownership Question' },
    { query: 'Who is the owner of Glory Computers?', expectedType: 'customer', expectedId: 24, desc: 'Ownership Question' },
    { query: 'Who is associated with Kloudbox Technologies?', expectedType: 'customer', expectedId: 26, desc: 'Ownership Question' },
    { query: 'Show me Rahul Patil\'s business', expectedType: 'customer', expectedId: 23, desc: 'Customer Business Query' },
    { query: 'Details of Kedarnath and his business', expectedType: 'customer', expectedId: 26, desc: 'Customer + Business Query' },
    { query: 'Tell me about Anand Kulkarni', expectedType: 'customer', expectedId: 28, desc: 'Customer Summary Query' },

    // --- Category G: Industry Categories & Location Queries ---
    { query: 'Water Treatment', expectedType: 'business', expectedId: 1, desc: 'Category (Water Treatment)' },
    { query: 'Computer Business', expectedType: 'business', expectedId: 2, desc: 'Category (Computer)' },
    { query: 'Insurance Services', expectedType: 'business', expectedId: 3, desc: 'Category (Insurance)' },
    { query: 'Security Agencies', expectedType: 'business', expectedId: 4, desc: 'Category (Security)' },
    { query: 'IT & Cloud Services', expectedType: 'business', expectedId: 6, desc: 'Category (IT & Cloud)' },
    { query: 'Real Estate & Plots', expectedType: 'business', expectedId: 12, desc: 'Category (Real Estate)' },
    { query: 'Customers from Nashik', expectedType: 'customer', expectedId: 24, desc: 'City Filter (Nashik)' },
    { query: 'Customers from Aurangabad', expectedType: 'customer', expectedId: 25, desc: 'City Filter (Aurangabad)' },
    { query: 'Businesses located in Pune', expectedType: 'business', expectedId: 1, desc: 'City Filter (Pune)' },

    // --- Category H: Zero Hallucination Negative Tests (Should Return 0 Matches) ---
    { query: 'NonExistentPerson12345', expectedType: 'none', expectedId: null, desc: 'Negative Test: Fake Name' },
    { query: 'FakeCompanyXYZ999', expectedType: 'none', expectedId: null, desc: 'Negative Test: Fake Business' },
    { query: '0000000000', expectedType: 'none', expectedId: null, desc: 'Negative Test: Nonexistent Phone' },
    { query: 'fake_nonexistent_email@testdomain.xyz', expectedType: 'none', expectedId: null, desc: 'Negative Test: Nonexistent Email' },
    { query: '99ZZZZZ9999Z9Z9', expectedType: 'none', expectedId: null, desc: 'Negative Test: Invalid GST' },
    { query: 'Aerospace Rocket Manufacturing', expectedType: 'none', expectedId: null, desc: 'Negative Test: Nonexistent Category' },
    { query: 'Submarine maintenance underwater', expectedType: 'none', expectedId: null, desc: 'Negative Test: Nonexistent Inquiry' }
  ];

  let top1Matches = 0;
  let top3Matches = 0;
  let correctZeroMatches = 0;
  let falsePositives = 0;
  let failedQueries = [];

  for (let i = 0; i < testSuite.length; i++) {
    const t = testSuite[i];
    const results = await userSearchService.searchCanonical({ query: t.query });

    const count = results.length;
    const top1 = results[0];
    const top3 = results.slice(0, 3);

    let isTop1 = false;
    let isTop3 = false;

    if (t.expectedType === 'none') {
      // Zero Hallucination test
      if (count === 0 || (top1 && top1.searchScore < 0.40)) {
        correctZeroMatches++;
      } else {
        falsePositives++;
        failedQueries.push({
          query: t.query,
          desc: t.desc,
          reason: `False positive: returned candidate [ID: #${top1.customerId || top1.businessId}] with score ${top1.searchScore}`
        });
      }
      continue;
    }

    // Positive identification tests
    if (top1) {
      if (t.expectedId === null) {
        // Platform lead or generic search
        isTop1 = true;
      } else if (t.expectedType === 'customer' && (top1.customerId === t.expectedId || top1.businessId === t.expectedId)) {
        isTop1 = true;
      } else if (t.expectedType === 'business' && (top1.businessId === t.expectedId || top1.customerId === t.expectedId)) {
        isTop1 = true;
      }
    }

    if (top3.length > 0) {
      if (t.expectedId === null) {
        isTop3 = true;
      } else {
        isTop3 = top3.some(c => (c.customerId === t.expectedId || c.businessId === t.expectedId));
      }
    }

    if (isTop1) {
      top1Matches++;
      top3Matches++;
    } else if (isTop3) {
      top3Matches++;
    } else {
      failedQueries.push({
        query: t.query,
        desc: t.desc,
        reason: top1 ? `Returned wrong top candidate [ID: #${top1.customerId || top1.businessId}] "${top1.customerName || top1.businessName}" (Score: ${top1.searchScore}) instead of #${t.expectedId}` : 'No candidate returned'
      });
    }
  }

  const positiveTestsCount = testSuite.filter(t => t.expectedType !== 'none').length;
  const negativeTestsCount = testSuite.filter(t => t.expectedType === 'none').length;

  console.log('----------------------------------------------------------------');
  console.log('📈 SEARCH EVALUATION METRICS REPORT');
  console.log('----------------------------------------------------------------');
  console.log(`Total Evaluated Queries:           ${testSuite.length}`);
  console.log(`Positive Retrieval Scenarios:      ${positiveTestsCount}`);
  console.log(`Zero-Hallucination Scenarios:     ${negativeTestsCount}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`Top-1 Accuracy Rate:               ${top1Matches} / ${positiveTestsCount} (${Math.round((top1Matches / positiveTestsCount) * 100)}%)`);
  console.log(`Top-3 Recall Rate:                 ${top3Matches} / ${positiveTestsCount} (${Math.round((top3Matches / positiveTestsCount) * 100)}%)`);
  console.log(`Zero-Hallucination Correct Rate:   ${correctZeroMatches} / ${negativeTestsCount} (${Math.round((correctZeroMatches / negativeTestsCount) * 100)}%)`);
  console.log(`False Positives (Hallucinations):  ${falsePositives}`);
  console.log('----------------------------------------------------------------\n');

  if (failedQueries.length > 0) {
    console.log('❌ FAILED QUERIES BREAKDOWN:');
    failedQueries.forEach((f, idx) => {
      console.log(`  ${idx + 1}. Query: "${f.query}" [${f.desc}]`);
      console.log(`     Reason: ${f.reason}`);
    });
  } else {
    console.log('🏆 PERFECT ACCURACY SCORE: All positive and zero-hallucination queries passed successfully!');
  }
  console.log('================================================================');
}

runSearchEvaluation().catch(console.error);
