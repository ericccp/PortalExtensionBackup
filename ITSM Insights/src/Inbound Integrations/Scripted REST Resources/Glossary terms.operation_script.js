(function process(/*RESTAPIRequest*/ request, /*RESTAPIResponse*/ response) {
    // Glossary index for the itamGlossaryTerms directive. Records are read with
    // GlideRecordSecure, so the caller only sees terms their ACLs allow.
    try {
        var util = new ITAMPortalUtil();
        response.setHeader('Cache-Control', 'private, max-age=300');
        response.setBody({
            glossaryUrl: '?id=itam_learning&tab=glossary',
            labels: {
                hint: gs.getMessage('Select the term to open it in the glossary.')
            },
            terms: util.getGlossaryTooltips()
        });
    } catch (e) {
        gs.error('ITAM Portal REST glossary_terms: ' + e);
        response.setStatus(500);
        response.setBody({ terms: [] });
    }
})(request, response);
