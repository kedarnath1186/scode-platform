const userSearchService = require('./userSearchService');
const analyticsService = require('./analyticsService');

// In-memory conversation context store (keyed by sessionId or adminId)
const sessionContextStore = new Map();

class ChatService {
  /**
   * Main entry point to process natural language queries from Admin.
   * Strictly grounded in database evidence with zero hallucination.
   */
  async processMessage(rawMessage, adminContext = {}, sessionId = 'default') {
    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return {
        success: true,
        intent: 'GREETING',
        confidence: 'HIGH',
        type: 'info',
        message: 'Please provide a message or search query.',
        reply: 'Hello! I am your SCode Database Assistant. You can ask queries grounded in our database such as:\n• "Find Rahul Patil"\n• "Who owns Clean Water Solutions?"\n• "Show businesses in Pune"\n• "Customers with Tally inquiries"\n• "Phone 9876543210" or "GST 27AAACP1234A1Z5"',
        evidence: null,
        results: []
      };
    }

    const message = rawMessage.trim();
    const sessionKey = (sessionId && sessionId !== 'default') ? sessionId : (adminContext.id ? `admin_${adminContext.id}` : 'default');

    let context = sessionContextStore.get(sessionKey) || {
      lastResults: [],
      selectedCustomerId: null,
      selectedBusinessId: null,
      lastQuery: null
    };

    const lower = message.toLowerCase();

    // 1. Handle Greetings & Capability Help
    if (this.isGreeting(lower)) {
      return {
        success: true,
        intent: 'GREETING',
        confidence: 'HIGH',
        type: 'info',
        message: 'SCode Database Assistant Ready',
        reply: `Hello${adminContext.username ? ' ' + adminContext.username : ''}! I am your SCode Database AI Assistant. 🤖\n\nEvery answer I provide is strictly grounded in actual database records from our \`users\`, \`businesses\`, \`leads\`, and \`services\` tables (Zero Hallucination).\n\n**Search Capabilities:**\n• 👤 **Customer & Multi-term**: "Find Rahul Patil", "Rahul Pune", "Rahul Clean Water"\n• 🏢 **Business & Category**: "Find Clean Water Solutions", "Businesses in Pune", "Businesses related to water treatment"\n• 🔗 **Relationships**: "Who owns Clean Water Solutions?", "Show Rahul's business"\n• 📩 **Inquiries & Requests**: "Show customers with Tally inquiries", "Inquiries about water plant"\n• 🔍 **Exact Identifiers**: "Phone 9876543210", "Email rahul@gmail.com", "GST 27AAACP1234A1Z5"\n• 📊 **Analytics**: "How many leads are new", "Count of businesses in Pune", "List all businesses that are live", "Top 5 businesses"`,
        evidence: null,
        results: []
      };
    }

    if (this.isHelp(lower)) {
      return {
        success: true,
        intent: 'HELP',
        confidence: 'HIGH',
        type: 'info',
        message: 'Database Assistant Guide',
        reply: `Here are the grounded search operations supported across the database:\n• **Customer Lookup**: "Find Rahul Patil", "Rahul Sharma", "Kedarnath"\n• **Business Lookup**: "Clean Water Solutions", "Glory Computers", "Kloudbox"\n• **Cross-Entity Multi-term**: "Rahul Clean Water Pune", "Rahul's Tally inquiry"\n• **Ownership & Links**: "Who owns Clean Water Solutions?", "Show Rahul's business"\n• **Inquiries / Leads**: "Customers with Tally inquiries", "Inquiries about RO plant"\n• **Location Filters**: "Customers from Nashik", "Businesses in Pune"\n• **Contact & Identifiers**: "Phone 9876543210", "Email rahul@gmail.com", "GST 27AAACP1234A1Z5"\n• **Follow-up Context**: "The one from Pune", "What is his business?", "Where is it located?", "What was his latest inquiry?"\n• **Analytics**: "How many leads are new", "Count of businesses in Pune", "List all businesses that are live", "Top 5 businesses", "How many leads this week"`,
        evidence: null,
        results: []
      };
    }

    // 2. Handle Conversational Follow-Up via Primary/Foreign Key Resolution
    const followUp = await this.handleContextFollowUp(message, context);
    if (followUp) {
      if (followUp.updatedContext) {
        context = { ...context, ...followUp.updatedContext };
        sessionContextStore.set(sessionKey, context);
      }
      return followUp.response;
    }

    // 3. Aggregation / Analytics Intent (counts, "top N", filtered lists, date ranges)
    // Runs real SQL — handled separately from entity search since it answers a
    // different class of question ("how many" / "list all") rather than "find X".
    try {
      const analyticsResult = await analyticsService.tryHandle(message);
      if (analyticsResult) {
        return analyticsResult;
      }
    } catch (err) {
      console.error('Analytics intent error (falling back to entity search):', err);
    }

    // 4. Multi-Stage Hybrid Candidate Retrieval across Canonical Documents
    const candidates = await userSearchService.searchCanonical({ query: message });

    // 4. Zero / Low Confidence Handling (No Database Hallucination)
    if (candidates.length === 0 || candidates[0].searchScore < 0.40) {
      return {
        success: true,
        intent: 'NO_MATCH',
        confidence: 'ZERO',
        type: 'no_results',
        message: 'No matching database records',
        reply: `I could not find any matching customer, business, or inquiry records in the database for **'${message}'**.\n\n💡 *Tip: Try searching by customer name (e.g. "Rahul Patil"), business name ("Clean Water Solutions"), city ("Pune"), email, phone number, or GST number.*`,
        evidence: null,
        results: []
      };
    }

    // 5. Evaluate Confidence Gating
    const top = candidates[0];
    const second = candidates[1];
    const isDominantTop = (candidates.length === 1) || (top.searchScore >= 0.88 && (!second || top.searchScore > second.searchScore + 0.12));

    // A. Single Dominant High-Confidence Match
    if (isDominantTop && top.searchScore >= 0.80) {
      // Save primary entity IDs in session context
      context = {
        lastResults: [top],
        selectedCustomerId: top.customerId,
        selectedBusinessId: top.businessId,
        lastQuery: message
      };
      sessionContextStore.set(sessionKey, context);

      const evidence = this.extractEvidence(top);
      const groundedReply = this.generateGroundedSingleCard(top, evidence, message);

      return {
        success: true,
        intent: 'GROUNDED_SINGLE_MATCH',
        confidence: top.confidence,
        type: top.customerId ? 'user' : 'business',
        message: 'Record retrieved from database',
        reply: groundedReply,
        evidence,
        results: [top]
      };
    }

    // B. Medium Confidence / Ambiguous Candidates -> Ask Clarification
    context = {
      lastResults: candidates,
      selectedCustomerId: null,
      selectedBusinessId: null,
      lastQuery: message
    };
    sessionContextStore.set(sessionKey, context);

    const disambiguationReply = this.generateDisambiguationList(candidates, message);
    return {
      success: true,
      intent: 'DISAMBIGUATION_REQUIRED',
      confidence: 'MEDIUM',
      type: 'multiple_users',
      message: `Found ${candidates.length} candidate matches`,
      reply: disambiguationReply,
      evidence: candidates.map(c => this.extractEvidence(c)),
      results: candidates
    };
  }

  /**
   * Handle contextual follow-ups grounded by Database Primary/Foreign Key IDs
   */
  async handleContextFollowUp(message, context) {
    const lower = message.toLowerCase().trim();

    // Context Case A: Disambiguation selection ("The one from Pune", "the Pune one", "from Nashik")
    if (context.lastResults && context.lastResults.length > 1) {
      const disambigMatch = lower.match(/^(?:show\s+)?(?:the\s+)?(?:one\s+)?(?:from|in)\s+([a-zA-Z]+)$/i) ||
                            lower.match(/^(?:the\s+)?([a-zA-Z]+)(?:\s+one)$/i) ||
                            lower.match(/^(?:show\s+the\s+)?([a-zA-Z]+)$/i);

      if (disambigMatch) {
        const targetTerm = disambigMatch[1].trim().toLowerCase();

        // Filter last candidates by city or name
        const directCustomerCity = context.lastResults.filter(r =>
          (r.city && r.city.toLowerCase() === targetTerm)
        );

        const targetCandidates = directCustomerCity.length === 1
          ? directCustomerCity
          : context.lastResults.filter(r =>
              (r.city && r.city.toLowerCase().includes(targetTerm)) ||
              (r.businessCity && r.businessCity.toLowerCase().includes(targetTerm)) ||
              (r.customerName && r.customerName.toLowerCase().includes(targetTerm)) ||
              (r.businessName && r.businessName.toLowerCase().includes(targetTerm))
            );

        if (targetCandidates.length === 1) {
          const selected = targetCandidates[0];
          const fullDoc = await userSearchService.getCustomerEntityById(selected.customerId) || selected;
          const evidence = this.extractEvidence(fullDoc);
          const reply = this.generateGroundedSingleCard(fullDoc, evidence, message);

          return {
            updatedContext: {
              selectedCustomerId: fullDoc.customerId,
              selectedBusinessId: fullDoc.businessId,
              lastResults: [fullDoc]
            },
            response: {
              success: true,
              intent: 'FOLLOW_UP_DISAMBIGUATION',
              confidence: 'HIGH',
              type: 'user',
              message: `Details retrieved for ${fullDoc.customerName}`,
              reply,
              evidence,
              results: [fullDoc]
            }
          };
        }
      }
    }

    // Context Case B: "What is his business?" / "Show his business" / "What business does he own?"
    const isPronounBusiness = (
      lower === 'what is his business?' || lower === 'what is his business' ||
      lower === 'what is her business' || lower === 'show his business' ||
      lower === 'his business' || lower === 'what business does he own?' ||
      lower === 'what business does he own' || lower === 'his company' ||
      lower.includes('his business') || lower.includes('what is his business')
    );

    if (isPronounBusiness && (context.selectedCustomerId || context.selectedBusinessId)) {
      const doc = context.selectedCustomerId
        ? await userSearchService.getCustomerEntityById(context.selectedCustomerId)
        : await userSearchService.getBusinessEntityById(context.selectedBusinessId);

      if (!doc) {
        return {
          response: {
            success: true,
            intent: 'GET_CUSTOMER_BUSINESS',
            confidence: 'HIGH',
            type: 'info',
            message: 'No record found in database',
            reply: 'I could not find a customer record matching the current conversation context in the database.',
            evidence: null,
            results: []
          }
        };
      }

      if (doc.businessName) {
        const gstText = doc.businessGst ? `\n• **GST**: ${doc.businessGst}` : '';
        const phoneText = doc.businessPhone ? `\n• **Phone**: ${doc.businessPhone}` : '';
        const emailText = doc.businessEmail ? `\n• **Email**: ${doc.businessEmail}` : '';
        const reply = `🏢 **${doc.customerName || 'Customer'}'s** registered business in the database is:\n\n**${doc.businessName}** [ID: #${doc.businessId}]\n• **Category**: ${doc.businessCategory || 'Commercial'}\n• **City / Location**: ${doc.businessCity || doc.city || 'N/A'}\n• **Address**: ${doc.businessAddress || doc.address || 'N/A'}${gstText}${phoneText}${emailText}\n• **Status**: 🟢 ${doc.businessStatus ? doc.businessStatus.toUpperCase() : 'LIVE'}`;

        return {
          updatedContext: {
            selectedBusinessId: doc.businessId
          },
          response: {
            success: true,
            intent: 'GET_CUSTOMER_BUSINESS',
            confidence: 'HIGH',
            type: 'business',
            message: 'Business retrieved from database',
            reply,
            evidence: this.extractEvidence(doc),
            results: [doc]
          }
        };
      } else {
        return {
          response: {
            success: true,
            intent: 'GET_CUSTOMER_BUSINESS',
            confidence: 'HIGH',
            type: 'info',
            message: 'No associated business in database',
            reply: `Customer **${doc.customerName}** (ID: #${doc.customerId}) does NOT have an associated business profile registered in the database.`,
            evidence: this.extractEvidence(doc),
            results: [doc]
          }
        };
      }
    }

    // Context Case C: "What was his latest inquiry?" / "his inquiry" / "latest inquiry"
    const isPronounInquiry = (
      lower.includes('latest inquiry') || lower.includes('his inquiry') ||
      lower.includes('her inquiry') || lower.includes('any inquiry') ||
      lower.includes('what was his request') || lower.includes('his latest inquiry')
    );

    if (isPronounInquiry && (context.selectedCustomerId || context.selectedBusinessId)) {
      const doc = context.selectedCustomerId
        ? await userSearchService.getCustomerEntityById(context.selectedCustomerId)
        : await userSearchService.getBusinessEntityById(context.selectedBusinessId);

      const name = doc ? (doc.customerName || doc.businessName) : 'User';

      if (doc && doc.inquiries && doc.inquiries.length > 0) {
        const latest = doc.inquiries[0];
        const reply = `📩 **Latest Inquiry Record from ${name}:**\n\n• **Inquiry ID**: #${latest.id}\n• **Message**: "${latest.message}"\n• **Service Requested**: ${latest.serviceRequested || 'General Inquiries'}\n• **Status**: ${latest.status || 'new'}\n• **Date**: ${latest.createdAt || 'N/A'}`;

        return {
          response: {
            success: true,
            intent: 'GET_INQUIRY',
            confidence: 'HIGH',
            type: 'info',
            message: 'Inquiry record retrieved from database',
            reply,
            evidence: this.extractEvidence(doc),
            results: [doc]
          }
        };
      } else {
        return {
          response: {
            success: true,
            intent: 'GET_INQUIRY',
            confidence: 'HIGH',
            type: 'info',
            message: 'No inquiry in database',
            reply: `No inquiry or lead records were found in the database for **${name}**.`,
            evidence: doc ? this.extractEvidence(doc) : null,
            results: doc ? [doc] : []
          }
        };
      }
    }

    // Context Case D: "Where is it located?" / "Where is he located?" / "What is the address?"
    const isLocationQuery = (
      lower === 'where is it located?' || lower === 'where is it located' ||
      lower === 'location' || lower === 'what is the address' ||
      lower === 'where is he located' || lower.includes('where is it located') ||
      lower.includes('what is the address') || lower.includes('where is he located')
    );

    if (isLocationQuery && (context.selectedCustomerId || context.selectedBusinessId)) {
      const doc = context.selectedCustomerId
        ? await userSearchService.getCustomerEntityById(context.selectedCustomerId)
        : await userSearchService.getBusinessEntityById(context.selectedBusinessId);

      if (doc) {
        const name = doc.businessName || doc.customerName;
        const addr = doc.businessAddress || doc.address || 'Address not provided in database';
        const city = doc.businessCity || doc.city || 'N/A';
        const state = doc.businessState || doc.state || 'Maharashtra';
        const pincode = doc.businessPincode || doc.pincode ? ` - ${doc.businessPincode || doc.pincode}` : '';

        const reply = `📍 **${name}** is located at:\n**${addr}**\n• **City / State**: ${city}, ${state}${pincode}`;

        return {
          response: {
            success: true,
            intent: 'GET_LOCATION',
            confidence: 'HIGH',
            type: 'info',
            message: 'Location retrieved from database',
            reply,
            evidence: this.extractEvidence(doc),
            results: [doc]
          }
        };
      }
    }

    return null;
  }

  /**
   * Extract strict Fact Evidence object from Canonical Document
   */
  extractEvidence(doc) {
    if (!doc) return null;
    return {
      customer: doc.customerId ? {
        id: doc.customerId,
        name: doc.customerName,
        email: doc.email,
        phone: doc.phone,
        city: doc.city,
        state: doc.state,
        pincode: doc.pincode,
        address: doc.address,
        gst: doc.customerGst,
        role: doc.customerRole,
        status: doc.customerStatus
      } : null,
      business: doc.businessId ? {
        id: doc.businessId,
        name: doc.businessName,
        slug: doc.businessSlug,
        category: doc.businessCategory,
        tagline: doc.businessTagline,
        description: doc.businessDescription,
        city: doc.businessCity,
        state: doc.businessState,
        pincode: doc.businessPincode,
        address: doc.businessAddress,
        gst: doc.businessGst,
        phone: doc.businessPhone,
        email: doc.businessEmail,
        status: doc.businessStatus
      } : null,
      inquiries: doc.inquiries || [],
      services: doc.services || []
    };
  }

  /**
   * Generate Grounded Single Result Presentation
   * Validated strictly against evidence
   */
  generateGroundedSingleCard(doc, evidence, query) {
    const isCustomerPrimary = !!doc.customerId;

    if (isCustomerPrimary) {
      const u = evidence.customer;
      const b = evidence.business;
      const inq = evidence.inquiries.length > 0 ? evidence.inquiries[0] : null;

      const bizText = b
        ? `\n• **Associated Business**: **${b.name}** [ID: #${b.id}] (${b.category || 'Commercial'})\n• **Business Location**: ${b.city || u.city || 'N/A'}${b.address ? ` — ${b.address}` : ''}`
        : '\n• **Associated Business**: *None registered in database*';

      const gstText = u.gst ? `\n• **GST**: ${u.gst}` : (b && b.gst ? `\n• **Business GST**: ${b.gst}` : '');
      const inqText = inq ? `\n• **Latest Inquiry**: "${inq.message}" (${inq.serviceRequested || 'General'})` : '';

      return `Found 1 matching customer in database:\n\n👤 **${u.name}** [ID: #${u.id}]\n• **Email**: ${u.email || 'Not provided'}\n• **Phone**: ${u.phone || 'Not provided'}\n• **City / State**: ${u.city || 'N/A'}, ${u.state || 'Maharashtra'}\n• **Address**: ${u.address || 'N/A'}${gstText}${bizText}${inqText}\n• **Status**: ${u.status === 'active' ? '🟢 Active' : '⚪ ' + (u.status || 'inactive')}`;
    } else if (evidence.business) {
      const b = evidence.business;
      const ownerText = doc.customerName ? `\n• **Owner**: ${doc.customerName} (${doc.email || 'N/A'})` : '';
      const inq = evidence.inquiries.length > 0 ? evidence.inquiries[0] : null;
      const inqText = inq ? `\n• **Recent Inquiry**: "${inq.message}"` : '';

      return `Found 1 matching business in database:\n\n🏢 **${b.name}** [ID: #${b.id}]\n• **Category**: ${b.category || 'Commercial'}\n• **Tagline**: ${b.tagline || 'N/A'}\n• **City / State**: ${b.city || 'N/A'}, ${b.state || 'Maharashtra'}\n• **Address**: ${b.address || 'N/A'}\n• **GST**: ${b.gst || 'N/A'}\n• **Phone**: ${b.phone || 'N/A'}${ownerText}${inqText}\n• **Status**: 🟢 ${b.status ? b.status.toUpperCase() : 'LIVE'}`;
    } else {
      // Platform-level inquiry: a lead submitted with no linked customer or business record
      // (e.g. a general contact-form submission not tied to any specific business page).
      const inq = evidence.inquiries.length > 0 ? evidence.inquiries[0] : null;
      const nameText = doc.customerName || 'Unknown';
      const emailText = doc.email ? `\n• **Email**: ${doc.email}` : '';
      const phoneText = doc.phone ? `\n• **Phone**: ${doc.phone}` : '';
      const inqText = inq
        ? `\n• **Message**: "${inq.message}"\n• **Service Requested**: ${inq.serviceRequested || 'General Inquiry'}\n• **Status**: ${inq.status || 'new'}\n• **Date**: ${inq.createdAt || 'N/A'}`
        : '';

      return `Found 1 matching inquiry in database:\n\n📩 **${nameText}** (Platform-level inquiry — not linked to a specific business)${emailText}${phoneText}${inqText}`;
    }
  }

  /**
   * Generate Disambiguation List when multiple candidate matches exist
   */
  generateDisambiguationList(candidates, query) {
    const count = candidates.length;
    let listText = `I found **${count} candidate records** matching your search:\n\n`;

    candidates.slice(0, 6).forEach((c, idx) => {
      const isCustomer = !!c.customerId;
      const title = c.customerName || c.businessName;
      const bizInfo = c.businessName && isCustomer ? ` | Business: **${c.businessName}**` : (c.businessCategory ? ` | ${c.businessCategory}` : '');
      const loc = (c.city || c.businessCity) ? ` (${c.city || c.businessCity})` : '';
      const idStr = isCustomer ? `[Customer ID: #${c.customerId}]` : `[Business ID: #${c.businessId}]`;

      listText += `${idx + 1}. **${title}** — ${c.email || c.phone || 'N/A'}${loc}${bizInfo} ${idStr}\n`;
    });

    listText += `\n🔍 *Which record do you mean? You can say "The one from Pune" or specify the Customer ID or full name.*`;
    return listText;
  }

  isGreeting(text) {
    const greetings = ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good afternoon', 'good evening', 'who are you', 'howdy', 'hola'];
    const stripped = text.replace(/[^a-z\s]/g, '').trim();
    return greetings.includes(stripped);
  }

  isHelp(text) {
    const helpTriggers = ['help', 'what can you do', 'how to use', 'commands', 'options', 'features', 'guide'];
    return helpTriggers.some(trigger => text.includes(trigger));
  }
}

module.exports = new ChatService();
