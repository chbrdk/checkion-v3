/**
 * Parse llms.txt for spec-compliant validation.
 * Sections: Description, Rules, Allow, Block, Sitemap, Contact, Policy,
 * Attribution, License, User-LLM (per llms-txt spec).
 */

export interface LlmsTxtParsed {
    sections: string[];
    hasSitemap: boolean;
    /** Content of Rules: section (first 500 chars). */
    rulesContent?: string;
    /** Allow/Block directives: paths or LLM names. */
    allowPaths: string[];
    blockPaths: string[];
    /** Markdown links found (e.g. /page.md) – for reachability check. */
    markdownUrls: string[];
    /** Required spec: Title (H1), Description (blockquote). */
    hasTitle: boolean;
    hasDescription: boolean;
}

const SECTION_NAMES = [
    'Description', 'Rules', 'Allow', 'Block', 'Sitemap', 'Contact', 'Policy',
    'Attribution', 'License', 'User-LLM', 'Optional'
];

export function parseLlmsTxt(body: string, baseOrigin: string): LlmsTxtParsed {
    const sections: string[] = [];
    let hasSitemap = false;
    let rulesContent: string | undefined;
    const allowPaths: string[] = [];
    const blockPaths: string[] = [];
    const markdownUrls: string[] = [];
    let hasTitle = false;
    let hasDescription = false;

    SECTION_NAMES.forEach((name) => {
        if (new RegExp('^\\s*' + name + '\\s*:', 'im').test(body) || body.includes('## ' + name) || body.includes('# ' + name)) {
            sections.push(name);
        }
    });

    // Sitemap
    hasSitemap = /^\s*Sitemap:\s*https?:\/\//im.test(body) || /\bhttps?:\/\/[^\s]+\/sitemap[^\s]*/i.test(body);

    // Rules content – text between "Rules:" and next section
    const rulesRe = /\bRules\s*:\s*([\s\S]*?)(?=\n\s*(?:Description|Rules|Allow|Block|Sitemap|Contact|Policy|Attribution|License|User-LLM|##)\s*:|$)/im;
    const rulesMatch = body.match(rulesRe);
    if (rulesMatch && rulesMatch[1]) {
        const content = rulesMatch[1].trim();
        rulesContent = content.slice(0, 500);
    }

    // Allow / Block – simple path extraction
    const allowMatch = body.match(/\bAllow\s*:\s*([^\n]+)/im);
    if (allowMatch) allowPaths.push(...allowMatch[1].split(/[,;\s]+/).map(s => s.trim()).filter(Boolean));
    const blockMatch = body.match(/\bBlock\s*:\s*([^\n]+)/im);
    if (blockMatch) blockPaths.push(...blockMatch[1].split(/[,;\s]+/).map(s => s.trim()).filter(Boolean));

    // Markdown URLs: - [Title](url) or bare .md links
    const mdLinkRegex = /\[([^\]]*)\]\((https?:\/\/[^)]+\.md[^)]*)\)|(https?:\/\/[^\s)]+\.md)/gi;
    let m;
    while ((m = mdLinkRegex.exec(body)) !== null) {
        const url = m[2] || m[3];
        if (url && !markdownUrls.includes(url)) markdownUrls.push(url);
    }
    // Relative .md links
    const relMdRegex = /\]\((\/[^)]+\.md[^)]*)\)/g;
    while ((m = relMdRegex.exec(body)) !== null) {
        const full = baseOrigin + m[1];
        if (!markdownUrls.includes(full)) markdownUrls.push(full);
    }

    // Spec required: Title (H1) and Description (blockquote)
    hasTitle = /^#\s+.+/m.test(body) || /^Title\s*:\s*.+/im.test(body);
    hasDescription = />\s*.+/m.test(body) || /^Description\s*:\s*.+/im.test(body);

    return {
        sections,
        hasSitemap,
        rulesContent: rulesContent || undefined,
        allowPaths,
        blockPaths,
        markdownUrls,
        hasTitle,
        hasDescription,
    };
}
