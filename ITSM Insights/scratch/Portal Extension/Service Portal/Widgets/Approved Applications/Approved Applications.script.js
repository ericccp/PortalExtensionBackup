(function() {
  // Number of applications shown per page in desktop and mobile layouts.
  data.pageSize = 5;

  // Filter dropdowns above the results. Set to false to hide the filter bar and
  // the applied-filter pills entirely; search and column sorting stay available.
  data.showFilters = true;

  // CUTOVER: verify the field names and optional filter, then set useSampleData
  // to false. These settings stay server-side; no client changes are needed.
  var source = {
    useSampleData: true,
    table: 'x_r_approved_apps',
    // Optional server-owned filter. Empty means all readable table records.
    // Use internal choice values if filtering by approval status.
    encodedQuery: '',
    // Proposed internal names: update these to match the table dictionary.
    // Record sys_id supplies the unique row ID, independently of any App ID field.
    fields: {
      name: 'application_name',
      vendor: 'vendor',
      category: 'category',
      purpose: 'business_purpose',
      status: 'approval_status',
      licensable: 'licensable',
      platforms: 'platforms_supported',
      requestProcess: 'request_process'
    }
  };

  // Configurable widget copy. Column and field labels stay with the view.
  data.text = {
    loadError: gs.getMessage("Applications could not be loaded. Please try again later."),
    paginationLabel: gs.getMessage("Application pages"),
    previousPage: gs.getMessage("Previous"),
    nextPage: gs.getMessage("Next"),
    pageLabel: gs.getMessage("Page"),
    showingLabel: gs.getMessage("Showing"),
    licensableYes: gs.getMessage("Yes"),
    licensableNo: gs.getMessage("No"),
    licensableUnspecified: gs.getMessage("Not specified"),
    title: gs.getMessage("Approved applications"),
    description: gs.getMessage("Find software for your work, check who can use it, and learn how to get access."),
    searchLabel: gs.getMessage("Search applications"),
    clearFilters: gs.getMessage("Clear filters"),
    countOf: gs.getMessage("of"),
    countApplications: gs.getMessage("applications"),
    filteredFrom: gs.getMessage("filtered from"),
    resetSearch: gs.getMessage("Reset"),
    filterBy: gs.getMessage("Filter by:"),
    apply: gs.getMessage("Apply"),
    applyFilter: gs.getMessage("Apply filter"),
    clear: gs.getMessage("Clear"),
    clearFilter: gs.getMessage("Clear filter"),
    clearAll: gs.getMessage("Clear all"),
    clearAppliedFilters: gs.getMessage("Clear applied filters"),
    currentlyFilteredBy: gs.getMessage("Currently filtered by"),
    removeFilter: gs.getMessage("Remove filter"),
    filterVendor: gs.getMessage("Vendor"),
    filterCategory: gs.getMessage("Category"),
    filterStatus: gs.getMessage("Status"),
    filterLicensable: gs.getMessage("Licensable"),
    sortBy: gs.getMessage("Sort by"),
    descendingHint: gs.getMessage("Descending order. Activate to sort ascending."),
    ascendingHint: gs.getMessage("Ascending order. Activate to sort descending."),
    descending: gs.getMessage("Descending"),
    ascending: gs.getMessage("Ascending"),
    tableLabel: gs.getMessage("Approved applications table"),
    tableCaption: gs.getMessage("Approved applications and access requirements. Select a column header to sort."),
    sortDescending: gs.getMessage("Sort descending"),
    sortAscending: gs.getMessage("Sort ascending"),
    noMatches: gs.getMessage("No applications found"),
    noApplications: gs.getMessage("No applications available"),
    searchHelp: gs.getMessage("Try another search term or clear the filters."),
    searchPlaceholder: gs.getMessage("Search applications")
  };

  data.loadError = false;
  if (!source.useSampleData) {
    data.applications = loadTableApplications();
    return;
  }

  function readField(record, field, raw) {
    var element = record.getElement(field);
    if (!element || !element.canRead()) return '';
    return String((raw ? record.getValue(field) : record.getDisplayValue(field)) || '');
  }

  function loadTableApplications() {
    var applications = [];
    try {
      var record = new GlideRecordSecure(source.table);
      if (!record.isValid()) throw new Error('Configured table is unavailable');
      var key;
      for (key in source.fields) {
        if (source.fields.hasOwnProperty(key) && !record.isValidField(source.fields[key])) {
          throw new Error('Invalid field mapping: ' + key);
        }
      }
      if (source.encodedQuery) record.addEncodedQuery(source.encodedQuery);
      record.orderBy(source.fields.name);
      record.query();
      // Load the full readable catalog: the client searches/sorts before paging.
      while (record.next()) {
        if (!record.canRead()) continue;
        var app = {id: String(record.getUniqueValue())};
        for (key in source.fields) {
          if (source.fields.hasOwnProperty(key)) {
            app[key] = readField(record, source.fields[key], key === 'licensable');
          }
        }
        // ServiceNow Boolean fields return raw "1"/"0" or "true"/"false".
        // Unreadable/empty/unrecognized values remain unspecified, never "No".
        var licensable = app.licensable.toLowerCase();
        app.licensable = licensable === '1' || licensable === 'true' ? true :
          (licensable === '0' || licensable === 'false' ? false : null);
        applications.push(app);
      }
      return applications;
    } catch (error) {
      gs.error('Approved Applications: unable to load ' + source.table + ': ' + error.message);
      data.loadError = true;
      // Never substitute sample records when the live source fails.
      return [];
    }
  }

  // CSV snapshot plus 15 fictional pagination fixtures (SAMPLE-* IDs).
  // Fixtures: offline_folder/approved_applications_pagination_samples.json.
  // Regenerate with offline_folder/build_approved_applications.py.
  // Only used while source.useSampleData is true.
  // BEGIN GENERATED APPLICATIONS
  data.applications = [
    {
      "id": "APP-1001",
      "name": "Microsoft 365",
      "vendor": "Microsoft",
      "category": "Productivity Suite",
      "purpose": "Email, document creation, and collaboration",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Windows/Mac/Web/iOS/Android",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": true
    },
    {
      "id": "APP-1002",
      "name": "Slack",
      "vendor": "Salesforce (Slack Technologies)",
      "category": "Collaboration & Messaging",
      "purpose": "Team messaging and cross-department collaboration",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/Windows/Mac/iOS/Android",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": true
    },
    {
      "id": "APP-1003",
      "name": "Zoom Workplace",
      "vendor": "Zoom Video Communications",
      "category": "Video Conferencing",
      "purpose": "Video conferencing and webinars",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/Windows/Mac/iOS/Android",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": true
    },
    {
      "id": "APP-1004",
      "name": "Salesforce Sales Cloud",
      "vendor": "Salesforce",
      "category": "CRM",
      "purpose": "Customer relationship management and sales pipeline",
      "status": "Approved",
      "departments": "Sales; Marketing; Customer Success",
      "platforms": "Web/iOS/Android",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1005",
      "name": "ServiceNow",
      "vendor": "ServiceNow",
      "category": "ITSM/ITAM Platform",
      "purpose": "IT service management, asset management, workflow automation",
      "status": "Approved",
      "departments": "IT; Facilities; HR",
      "platforms": "Web",
      "requestProcess": "Access via role request in ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1006",
      "name": "Workday",
      "vendor": "Workday Inc.",
      "category": "HCM/Payroll",
      "purpose": "Human capital management and payroll processing",
      "status": "Approved",
      "departments": "HR; Finance; People Managers",
      "platforms": "Web/iOS/Android",
      "requestProcess": "Restricted - HR/Finance only",
      "licensable": true
    },
    {
      "id": "APP-1007",
      "name": "SAP S/4HANA",
      "vendor": "SAP",
      "category": "ERP",
      "purpose": "Enterprise resource planning - finance, supply chain",
      "status": "Approved",
      "departments": "Finance; Supply Chain; Procurement",
      "platforms": "Windows/Web",
      "requestProcess": "Restricted - Finance approval required",
      "licensable": true
    },
    {
      "id": "APP-1008",
      "name": "Adobe Creative Cloud",
      "vendor": "Adobe",
      "category": "Design & Creative",
      "purpose": "Graphic design, video editing, and creative production",
      "status": "Approved",
      "departments": "Marketing; Design; Communications",
      "platforms": "Windows/Mac",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1009",
      "name": "GitHub Enterprise Cloud",
      "vendor": "GitHub (Microsoft)",
      "category": "Software Development",
      "purpose": "Source control, CI/CD, and code collaboration",
      "status": "Approved",
      "departments": "Engineering; IT Development",
      "platforms": "Web/CLI",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1010",
      "name": "Jira Software + Confluence",
      "vendor": "Atlassian",
      "category": "Project Management",
      "purpose": "Agile project tracking and team documentation",
      "status": "Approved",
      "departments": "Engineering; Product; IT; PMO",
      "platforms": "Web",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1011",
      "name": "Okta",
      "vendor": "Okta Inc.",
      "category": "Identity & Access Management",
      "purpose": "Single sign-on and identity governance",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/iOS/Android",
      "requestProcess": "Pre-approved - platform infrastructure",
      "licensable": true
    },
    {
      "id": "APP-1012",
      "name": "CrowdStrike Falcon",
      "vendor": "CrowdStrike",
      "category": "Endpoint Security",
      "purpose": "Endpoint detection and response (EDR)",
      "status": "Approved",
      "departments": "All Departments (Device-Level)",
      "platforms": "Windows/Mac/Linux",
      "requestProcess": "Auto-deployed via MDM",
      "licensable": true
    },
    {
      "id": "APP-1013",
      "name": "Tableau",
      "vendor": "Salesforce (Tableau)",
      "category": "Business Intelligence",
      "purpose": "Data visualization and analytics dashboards",
      "status": "Approved",
      "departments": "Finance; Operations; Analytics",
      "platforms": "Web/Windows/Mac",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1014",
      "name": "DocuSign",
      "vendor": "DocuSign Inc.",
      "category": "eSignature",
      "purpose": "Electronic signature and contract execution",
      "status": "Approved",
      "departments": "Legal; HR; Procurement; Sales",
      "platforms": "Web/iOS/Android",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1015",
      "name": "Zscaler Internet Access",
      "vendor": "Zscaler",
      "category": "Network Security",
      "purpose": "Secure web gateway and cloud proxy",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Windows/Mac/iOS/Android",
      "requestProcess": "Auto-deployed via MDM",
      "licensable": true
    },
    {
      "id": "APP-1016",
      "name": "1Password Business",
      "vendor": "1Password (AgileBits)",
      "category": "Password Management",
      "purpose": "Enterprise password and secrets management",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Windows/Mac/iOS/Android/Browser",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": true
    },
    {
      "id": "APP-1017",
      "name": "Figma",
      "vendor": "Figma Inc.",
      "category": "Design & Prototyping",
      "purpose": "UI/UX design and prototyping",
      "status": "Approved",
      "departments": "Product; Design; Engineering",
      "platforms": "Web/Windows/Mac",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1018",
      "name": "NetSuite",
      "vendor": "Oracle NetSuite",
      "category": "ERP (Subsidiary Use)",
      "purpose": "Financial management for select subsidiaries",
      "status": "Approved",
      "departments": "Finance (Subsidiary Ops)",
      "platforms": "Web",
      "requestProcess": "Restricted - Finance approval required",
      "licensable": true
    },
    {
      "id": "APP-1019",
      "name": "Miro",
      "vendor": "Miro (RealtimeBoard Inc.)",
      "category": "Visual Collaboration",
      "purpose": "Online whiteboarding and workshop facilitation",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/Windows/Mac",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "APP-1020",
      "name": "Zendesk",
      "vendor": "Zendesk Inc.",
      "category": "Customer Support",
      "purpose": "Customer support ticketing and helpdesk",
      "status": "Approved",
      "departments": "Customer Support; Customer Success",
      "platforms": "Web",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0001",
      "name": "Atlas Planner",
      "vendor": "Northstar Software",
      "category": "Project Management",
      "purpose": "Coordinate project milestones and team tasks",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/Windows/Mac",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0002",
      "name": "Beacon Analytics",
      "vendor": "Beacon Labs",
      "category": "Business Intelligence",
      "purpose": "Explore operational metrics and reporting dashboards",
      "status": "Approved",
      "departments": "Finance; Operations; Analytics",
      "platforms": "Web",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0003",
      "name": "Canvas Studio",
      "vendor": "Canvas Works",
      "category": "Design & Creative",
      "purpose": "Create campaign graphics and presentation assets",
      "status": "Approved",
      "departments": "Marketing; Design",
      "platforms": "Windows/Mac",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0004",
      "name": "Delta Notes",
      "vendor": "Delta Tools",
      "category": "Productivity",
      "purpose": "Capture meeting notes and organize team reference material",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/Windows/Mac/iOS/Android",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": false
    },
    {
      "id": "SAMPLE-0005",
      "name": "Echo Recorder",
      "vendor": "Echo Systems",
      "category": "Audio & Video",
      "purpose": "Record and edit internal training audio",
      "status": "Approved",
      "departments": "HR; Communications",
      "platforms": "Windows/Mac",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0006",
      "name": "Flow Diagrammer",
      "vendor": "Flow Tools",
      "category": "Diagramming",
      "purpose": "Document processes and system architecture",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": false
    },
    {
      "id": "SAMPLE-0007",
      "name": "Harbor Docs",
      "vendor": "Harbor Software",
      "category": "Knowledge Management",
      "purpose": "Publish searchable team documentation",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0008",
      "name": "Insight Survey",
      "vendor": "Insight Labs",
      "category": "Survey & Feedback",
      "purpose": "Collect employee feedback and analyze survey responses",
      "status": "Approved",
      "departments": "HR; Customer Success",
      "platforms": "Web",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0009",
      "name": "Juniper Tasks",
      "vendor": "Juniper Works",
      "category": "Task Management",
      "purpose": "Track personal tasks and shared checklists",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/iOS/Android",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": false
    },
    {
      "id": "SAMPLE-0010",
      "name": "Keystone API Client",
      "vendor": "Keystone Tools",
      "category": "Software Development",
      "purpose": "Test APIs and organize reusable request collections",
      "status": "Approved",
      "departments": "Engineering; IT Development",
      "platforms": "Windows/Mac/Linux",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0011",
      "name": "Lumen Capture",
      "vendor": "Lumen Software",
      "category": "Screen Capture",
      "purpose": "Create screenshots and annotated support guides",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Windows/Mac",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": false
    },
    {
      "id": "SAMPLE-0012",
      "name": "Meridian Scheduler",
      "vendor": "Meridian Systems",
      "category": "Scheduling",
      "purpose": "Manage appointment booking and team availability",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/iOS/Android",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0013",
      "name": "Nimbus File Transfer",
      "vendor": "Nimbus Labs",
      "category": "File Transfer",
      "purpose": "Transfer approved business files between managed systems",
      "status": "Approved",
      "departments": "IT; Operations",
      "platforms": "Windows/Mac/Linux",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    },
    {
      "id": "SAMPLE-0014",
      "name": "Orbit Editor",
      "vendor": "Orbit Tools",
      "category": "Text Editor",
      "purpose": "Edit plain text and configuration files",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Windows/Mac/Linux",
      "requestProcess": "Pre-approved - no request needed",
      "licensable": false
    },
    {
      "id": "SAMPLE-0015",
      "name": "Summit Workshop",
      "vendor": "Summit Works",
      "category": "Visual Collaboration",
      "purpose": "Facilitate planning workshops and brainstorming sessions",
      "status": "Approved",
      "departments": "All Departments",
      "platforms": "Web/Windows/Mac",
      "requestProcess": "Manager approval via ServiceNow",
      "licensable": true
    }
  ];
  // END GENERATED APPLICATIONS
})();
