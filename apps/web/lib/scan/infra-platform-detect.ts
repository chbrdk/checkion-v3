/**
 * Heuristic platform / CMS / shop / framework detection from DOM bundle (script/link URLs + generator meta).
 * Many systems are only visible when their CDN or asset URLs appear in the initial HTML.
 */

export type PlatformDetectInput = {
    generatorMeta: string | null;
    hasNextData: boolean;
    hasWpJsonLink: boolean;
    hasWpContentScript: boolean;
    bundleLower: string;
    haystackLower: string;
};

type Ctx = PlatformDetectInput & { gen: string };

type Rule = { name: string; match: (c: Ctx) => boolean };

/**
 * Rules are evaluated in order; each matching rule appends its `name` once (deduped).
 * Put more specific stacks (e.g. WooCommerce) after their base (WordPress) when they depend on it.
 */
const PLATFORM_RULES: Rule[] = [
    /* ─── JS frameworks & meta-frameworks ─── */
    { name: 'Next.js', match: (c) => c.hasNextData || c.bundleLower.includes('/_next/static') },
    { name: 'Nuxt', match: (c) => c.bundleLower.includes('/_nuxt/') },
    {
        name: 'SvelteKit',
        match: (c) => /\/_app\/immutable|\/_app\/env\.js/i.test(c.bundleLower),
    },
    {
        name: 'Remix',
        match: (c) => c.bundleLower.includes('@remix-run') || c.bundleLower.includes('/build/_shared'),
    },
    {
        name: 'Astro',
        match: (c) => /\/_astro\//i.test(c.bundleLower) || /\bastro\b.*\/_astro/i.test(c.haystackLower),
    },
    {
        name: 'Gatsby',
        match: (c) =>
            /gatsby-js|gatsby-script|___gatsby|\/commons\.js.*gatsby|gatsby\.cloud/i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Vue.js',
        match: (c) =>
            !c.bundleLower.includes('/_nuxt/') &&
            /vue\.runtime|vue\.min\.js|vue\.esm|@vue\//i.test(c.bundleLower),
    },
    {
        name: 'Angular',
        match: (c) => /angular(\.min)?\.js|ng\.version|@angular\//i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Ember',
        match: (c) => /ember\.|ember-cli|\/ember\//i.test(c.bundleLower),
    },
    {
        name: 'Svelte',
        match: (c) =>
            !/\/_app\/immutable/i.test(c.bundleLower) && /\bsvelte(\.min)?\.js|svelte\/internal/i.test(c.bundleLower),
    },

    /* ─── E-commerce ─── */
    {
        name: 'Shopify',
        match: (c) =>
            /cdn\.shopify\.com|shopifycdn\.com|myshopify\.com|shopify\.com\/s\/files/i.test(c.bundleLower) ||
            c.gen.includes('shopify'),
    },
    {
        name: 'WooCommerce',
        match: (c) =>
            /woocommerce|wc-add-to-cart|wc-ajax|wc-blocks|storefront/i.test(c.haystackLower) &&
            (c.hasWpContentScript || c.hasWpJsonLink || c.gen.includes('wordpress') || c.haystackLower.includes('wp-content')),
    },
    {
        name: 'BigCommerce',
        match: (c) => /bigcommerce\.com|bigcommerce\.|bc\.s3\.|mybigcommerce/i.test(c.bundleLower),
    },
    {
        name: 'Shopware',
        match: (c) => /shopware|shopware-cdn|storefront\.shopware/i.test(c.bundleLower) || c.gen.includes('shopware'),
    },
    {
        name: 'PrestaShop',
        match: (c) => /prestashop|prestashop\.|modules\/ps_/i.test(c.haystackLower) || c.gen.includes('prestashop'),
    },
    {
        name: 'Ecwid',
        match: (c) => /ecwid\.com|ecwid\.|app\.ecwid/i.test(c.bundleLower),
    },
    {
        name: 'Magento',
        match: (c) => /magento|mage\/cookies|magento\/static/i.test(c.bundleLower) || c.gen.includes('magento'),
    },
    {
        name: 'OpenCart',
        match: (c) => /opencart|catalog\/view\/theme/i.test(c.haystackLower) || c.gen.includes('opencart'),
    },
    {
        name: 'Salesforce Commerce Cloud',
        match: (c) => /demandware\.net|commercecloud\.salesforce|dw\.edge|on\.demandware/i.test(c.bundleLower),
    },
    {
        name: 'SAP Commerce (Hybris)',
        match: (c) => /hybris|sap\/cx|commerce\.sap/i.test(c.bundleLower + c.haystackLower),
    },

    /* ─── Site builders & hosted ─── */
    {
        name: 'Webflow',
        match: (c) => /webflow\.com|website-files\.com/i.test(c.bundleLower) || c.gen.includes('webflow'),
    },
    {
        name: 'Wix',
        match: (c) => /wix\.com|wixstatic\.com|parastorage\.com/i.test(c.bundleLower) || c.gen.includes('wix'),
    },
    {
        name: 'Squarespace',
        match: (c) => /squarespace\.com|squarespace-cdn/i.test(c.bundleLower) || c.gen.includes('squarespace'),
    },
    {
        name: 'Framer',
        match: (c) => /framer\.com|framerusercontent\.com/i.test(c.bundleLower) || c.gen.includes('framer'),
    },
    {
        name: 'Duda',
        match: (c) => /duda\.co|duda\.nw|multiscreensite\.com/i.test(c.bundleLower),
    },
    {
        name: 'Bubble',
        match: (c) => /bubble\.io|bubble\.is|cdn\.bubble/i.test(c.bundleLower),
    },
    {
        name: 'Tilda',
        match: (c) => /tilda\.ws|tilda\.cc|static\.tilda/i.test(c.bundleLower),
    },
    {
        name: 'Readymag',
        match: (c) => /readymag\.com|rm-content/i.test(c.bundleLower),
    },
    {
        name: 'Cargo',
        match: (c) => /cargo\.site|cargo\.collective/i.test(c.bundleLower),
    },

    /* ─── Classic / PHP CMS ─── */
    {
        name: 'WordPress',
        match: (c) =>
            c.hasWpJsonLink ||
            c.hasWpContentScript ||
            c.gen.includes('wordpress') ||
            /\/wp-includes\/|\/wp-content\//i.test(c.haystackLower),
    },
    {
        name: 'Elementor',
        match: (c) =>
            /elementor|elementor-pro/i.test(c.haystackLower) &&
            (c.hasWpContentScript || c.haystackLower.includes('wp-content') || c.gen.includes('wordpress')),
    },
    {
        name: 'Drupal',
        match: (c) => c.gen.includes('drupal') || /drupal\.js|\/sites\/default\/files|drupal\.org/i.test(c.bundleLower),
    },
    { name: 'Joomla', match: (c) => c.gen.includes('joomla') || /\/media\/joomla|joomla\.org/i.test(c.bundleLower) },
    {
        name: 'TYPO3',
        match: (c) =>
            c.gen.includes('typo3') ||
            /\/typo3\/|typo3temp|typo3conf|typo3\/sysext|\/fileadmin\/|\/typo3conf\//i.test(c.bundleLower),
    },
    {
        name: 'Craft CMS',
        match: (c) =>
            /craft\.js|craftcms|cdn\.craft\.cloud|craft\.cloud|\/cpresources\//i.test(c.bundleLower) ||
            c.gen.includes('craft cms'),
    },
    {
        name: 'Concrete CMS',
        match: (c) => /concretecms|concrete5|\/concrete\/|core\/concrete/i.test(c.haystackLower) || c.gen.includes('concrete'),
    },
    {
        name: 'Silverstripe',
        match: (c) => /silverstripe/i.test(c.bundleLower + c.haystackLower) || c.gen.includes('silverstripe'),
    },
    {
        name: 'ProcessWire',
        match: (c) => /processwire|\/wire\/|wire\/modules/i.test(c.haystackLower),
    },
    {
        name: 'Grav',
        match: (c) => /getgrav\.org|\/user\/themes\/grav/i.test(c.bundleLower) || c.gen.includes('grav'),
    },
    {
        name: 'Umbraco',
        match: (c) => /umbraco|\/umbraco\/|umb\-/i.test(c.haystackLower),
    },
    {
        name: 'Sitefinity',
        match: (c) => /sitefinity|telerik\.web\.ui/i.test(c.haystackLower),
    },
    {
        name: 'Ghost',
        match: (c) =>
            /ghost\.org|ghost\.io|ghost\.sdk|api\.ghost|\/ghost\/api|ghost\-headless/i.test(c.bundleLower + c.haystackLower) ||
            c.gen.includes('ghost'),
    },
    {
        name: 'Statamic',
        match: (c) => /statamic\.com|statamic\.|\/vendor\/statamic/i.test(c.bundleLower),
    },
    {
        name: 'Kirby',
        match: (c) => /getkirby\.com|kirbycms|kirby\/kirby/i.test(c.bundleLower) || c.gen.includes('kirby'),
    },

    /* ─── Enterprise / DXP ─── */
    {
        name: 'Adobe Experience Manager',
        match: (c) =>
            /etc\.clientlibs|\/libs\/granite|granite\/ui|\/crx\/|cq\.analytics|\/etc\/designs\/aem|\/libs\/dam\/|\/conf\/global\/settings\/dam/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Adobe Target',
        match: (c) =>
            /at\.js|mboxedge|adobetarget|tt\.omtrdc\.net|\.tt\.omtrdc\.|target\.adobe|adobedc\.net\/.*target/i.test(
                c.bundleLower
            ),
    },
    {
        name: 'Sitecore',
        match: (c) =>
            /sitecore|\/\-\/media\/|sc_experience|sitecore\.net|\/sitecore\/|shell\/sitecore/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Adobe Experience Platform / Launch',
        match: (c) => /assets\.adobedtm\.com|adobedtm\.com|launch\-adobe/i.test(c.bundleLower),
    },
    {
        name: 'Bloomreach (brXM / Engagement)',
        match: (c) =>
            /bloomreach\.com|brxm\.io|brx\-|hippo\.repository|hippo\-cms|discovery\.bloomreach|engagement\.bloomreach/i.test(
                c.bundleLower + c.haystackLower
            ) || c.gen.includes('bloomreach'),
    },
    {
        name: 'Optimizely CMS (Episerver)',
        match: (c) =>
            /episerver|world\.optimizely|epi\-server|episerver\.net|geta_notfound|util\/find\.aspx/i.test(
                c.bundleLower + c.haystackLower
            ) || c.gen.includes('episerver') || c.gen.includes('optimizely'),
    },
    {
        name: 'Liferay',
        match: (c) =>
            /liferay\.com|liferay\-|combo\?.*liferay|o\/headless\-delivery|\/o\/c\/|frontend\-js\-liferay/i.test(
                c.bundleLower + c.haystackLower
            ) || c.gen.includes('liferay'),
    },
    {
        name: 'Tridion / RWS (SDL Sites)',
        match: (c) =>
            /tridion|sdl\s*web|discover\.tridion|rws\.com\/dxa|triview|\/system\/assets\/|odata\/tridion/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'CoreMedia Content Cloud',
        match: (c) =>
            /coremedia|coremedia\.cloud|preview\.coremedia|content\.coremedia|cm\.preview/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'FirstSpirit (e-Spirit)',
        match: (c) =>
            /firstspirit|e\-spirit\.de|fs5\.|fs\-client|espirit\.io|cas\-firstspirit/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Magnolia CMS',
        match: (c) =>
            /magnolia\-cms|info\.magnolia\-cloud|magnolia\.public|\.magnolia\-authoring|dam\.magnolia/i.test(
                c.bundleLower + c.haystackLower
            ) || c.gen.includes('magnolia'),
    },
    {
        name: 'dotCMS',
        match: (c) =>
            /dotcms\.com|dotcms\-|\/dotcms\/|d\.a\.live|dotadmin/i.test(c.bundleLower + c.haystackLower) ||
            c.gen.includes('dotcms'),
    },
    {
        name: 'Jahia',
        match: (c) =>
            /jahia\.org|jahia\.com|\/modules\/jahia|jahia\-|javascripts\/jahia/i.test(c.bundleLower + c.haystackLower) ||
            c.gen.includes('jahia'),
    },
    {
        name: 'Squiz DXP (Matrix)',
        match: (c) =>
            /squiz\.net|squiz\.cloud|matrix\.squiz|editplus\.squiz|\/__data\/assets\/|squiz\-matrix/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Crownpeak (DXM / Velocity)',
        match: (c) =>
            /crownpeak\.com|crownpeakaccess|velocity\.crownpeak|\/crownpeak\/|cp\-velocity/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Kentico Xperience (on‑prem)',
        match: (c) => {
            const z = c.bundleLower + c.haystackLower;
            if (/kontent\.ai|deliver\.kenticocloud|api\.kontent\.ai/i.test(z)) return false;
            return (
                /kentico\.com\/(getmedia|getattachment|getfile|cmspages|cmsresources)|kentico_xperience|kenticomponents|kentico\.resource/i.test(
                    z
                ) || c.gen.includes('kentico')
            );
        },
    },
    {
        name: 'Acquia (Drupal Cloud)',
        match: (c) =>
            /acquia\-hosted|acquia\-sites\.com|acquia\.com\/|factory\.acquia|acsf\-|drupal\-hosted\.acquia/i.test(
                c.bundleLower
            ),
    },
    {
        name: 'Enonic XP',
        match: (c) =>
            /enonic\.com|enonic\.cloud|xp\-admin|\/admin\/rest\/|com\.enonic\.xp/i.test(c.bundleLower + c.haystackLower) ||
            c.gen.includes('enonic'),
    },
    {
        name: 'Crafter CMS',
        match: (c) =>
            /craftercms\.org|craftercms\.|studio\.crafter|\/static\-assets\/.*crafter|graphql\.crafter/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Oracle Content Management (OCE)',
        match: (c) =>
            /oracle\.com\/ocs|oraclecloud\.com\/content|ocecdn\.oraclecloud|cec\-|oracle\-content/i.test(c.bundleLower),
    },
    {
        name: 'Salesforce Experience Cloud (sites)',
        match: (c) =>
            /force\.com\/sfsites|site\.force\.com|experiencecloud\.salesforce|b\.cdn\.contenthub\.salesforce/i.test(
                c.bundleLower
            ),
    },
    {
        name: 'OpenText (TeamSite / WCM)',
        match: (c) =>
            /opentext\.com\/wcm|teamsite|livesite|open\-text\-wcm|vignette|mediabin/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'IBM Web Content Manager',
        match: (c) =>
            /ibm\.com\/wcm|portal\/wps\/|wps\/contenthandler|ibm\.digital|connections.*ibm/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'HCL Digital Experience (WebSphere Portal)',
        match: (c) =>
            /hcltechsw\.com|dx\.hcl|wps\/portal|websphere|ibm\.jsp.*portal/i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Censhare',
        match: (c) => /censhare\.com|censhare\.cloud|\/censhare\//i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Scrivito (WYSIWYG on React)',
        match: (c) => /scrivito\.com|api\.scrivito\.com|cdn\.scrivito/i.test(c.bundleLower) || c.gen.includes('scrivito'),
    },

    /* ─── Headless / API-first CMS & content APIs ─── */
    {
        name: 'Contentful',
        match: (c) =>
            /contentful\.com|ctfassets\.net|images\.ctfassets|graphql\.contentful|cdn\.contentful|preview\.contentful/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Sanity',
        match: (c) =>
            /sanity\.io|apicdn\.sanity|cdn\.sanity\.io|@sanity\/|sanity\-studio|api\.sanity\.io/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Storyblok',
        match: (c) =>
            /storyblok\.com/i.test(c.bundleLower + c.haystackLower) || c.gen.includes('storyblok'),
    },
    {
        name: 'Prismic',
        match: (c) =>
            /prismic\.io|prismic\.cdn|images\.prismic|cdn\.prismic|prismic\-api/i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Strapi',
        match: (c) =>
            /strapi\.io|strapiapp\.com|admin\.strapi|\/strapi\/|strapi\-plugin|media\.strapi/i.test(
                c.bundleLower + c.haystackLower
            ) || c.gen.includes('strapi'),
    },
    {
        name: 'Hygraph / GraphCMS',
        match: (c) =>
            /hygraph\.com|graphcdn\.net|graphcms\.com|api[\w.-]*\.graphcms\.com|eu-central-1\.cdn\.hygraph|us-east-1\.cdn\.hygraph/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    {
        name: 'Kontent.ai (Kontent)',
        match: (c) => /kontent\.ai|kenticocloud\.com|deliver\.kenticocloud|api\.kontent\.ai/i.test(c.bundleLower),
    },
    {
        name: 'Butter CMS',
        match: (c) => /buttercms\.com|cdn\.buttercms|api\.buttercms/i.test(c.bundleLower),
    },
    {
        name: 'Cosmic',
        match: (c) => /cosmicjs\.com|cdn\.cosmicjs|api\.cosmicjs/i.test(c.bundleLower),
    },
    {
        name: 'Builder.io',
        match: (c) => /builder\.io|cdn\.builder\.io|builder\.api/i.test(c.bundleLower),
    },
    {
        name: 'Payload CMS',
        match: (c) => /payloadcms\.com|cloud\.payloadcms|payloadcms|\/api\/payload/i.test(c.bundleLower),
    },
    {
        name: 'TinaCMS',
        match: (c) => /tina\.io|tina\.cloud|tinacms|forestry\.io/i.test(c.bundleLower),
    },
    {
        name: 'Directus',
        match: (c) => /directus\.io|directus\.app|\/directus\/|assets\.directus/i.test(c.bundleLower),
    },
    {
        name: 'DatoCMS',
        match: (c) => /datocms|dato\.cms|datocms-assets|www\.datocms-assets|graphql\.datocms/i.test(c.bundleLower),
    },
    {
        name: 'Amplience',
        match: (c) => /amplience\.net|cdn\.media\.amplience|api\.amplience|cdn\.cdn\.amplience/i.test(c.bundleLower),
    },
    {
        name: 'Contentstack',
        match: (c) =>
            /contentstack\.io|contentstack\.com|cdn\.contentstack|images\.contentstack|graphql\.contentstack/i.test(
                c.bundleLower
            ),
    },
    {
        name: 'Makeswift',
        match: (c) => /makeswift\.com|makeswift\.site|api\.makeswift/i.test(c.bundleLower),
    },
    {
        name: 'Caisy',
        match: (c) => /caisy\.io|caisy\.app|cdn\.caisy\.io|graphql\.caisy/i.test(c.bundleLower),
    },
    {
        name: 'microCMS',
        match: (c) => /microcms\.io|cdn\.microcms|images\.microcms/i.test(c.bundleLower),
    },
    {
        name: 'Flotiq',
        match: (c) => /flotiq\.com|cdn\.flotiq|api\.flotiq/i.test(c.bundleLower),
    },
    {
        name: 'Prepr',
        match: (c) => /prepr\.io|cdn\.prepr\.io|graphql\.prepr/i.test(c.bundleLower),
    },
    {
        name: 'TakeShape',
        match: (c) => /takeshape\.io|api\.takeshape\.io|images\.takeshape/i.test(c.bundleLower),
    },
    {
        name: 'Lexascms',
        match: (c) => /lexascms\.com|cdn\.lexascms|graphql\.lexascms/i.test(c.bundleLower),
    },
    {
        name: 'Crystallize',
        match: (c) => /crystallize\.com|cdn\.crystallize|api\.crystallize|media\.crystallize/i.test(c.bundleLower),
    },
    {
        name: 'Webiny',
        match: (c) => /webiny\.com|d\.webiny|cdn\.webiny|api\.webiny/i.test(c.bundleLower),
    },
    {
        name: 'Squidex',
        match: (c) => /squidex\.io|cloud\.squidex|cdn\.squidex/i.test(c.bundleLower),
    },
    {
        name: 'Cockpit CMS',
        match: (c) => /getcockpit\.com|cockpit\-cms|\/cockpit\//i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Keystone (KeystoneJS)',
        match: (c) => /keystonejs\.com|keystone\-admin|@keystone\-6/i.test(c.bundleLower),
    },
    {
        name: 'ApostropheCMS',
        match: (c) => /apostrophecms\.com|apos\-|a2\/static\/apos/i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Decap CMS (Netlify CMS)',
        match: (c) => /decapcms\.org|netlifycms|identity\.netlify/i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Hashnode (headless blog)',
        match: (c) => /hashnode\.dev|hashnode\.com\/api|cdn\.hashnode\.com/i.test(c.bundleLower),
    },
    {
        name: 'WordPress (headless / WPGraphQL)',
        match: (c) =>
            /wp\-graphql|\/graphql.*wordpress|wp\-json\/wp\/v2\/.*graphql/i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'Faust.js (WP headless)',
        match: (c) => /faustjs\.org|@faustwp|wp\-engine\-headless/i.test(c.bundleLower),
    },
    {
        name: 'Saleor (headless commerce)',
        match: (c) => /saleor\.io|cdn\.saleor|api\.saleor|storefront\.saleor/i.test(c.bundleLower),
    },
    {
        name: 'Medusa',
        match: (c) => /medusajs\.com|medusa\-cdn|api\.medusa|js\.medusa/i.test(c.bundleLower),
    },
    {
        name: 'Commerce Layer',
        match: (c) => /commercelayer\.io|cdn\.commercelayer|api\.commercelayer/i.test(c.bundleLower),
    },
    {
        name: 'Shopify Hydrogen / Storefront API',
        match: (c) =>
            /hydrogen\.shopify|shopify\.com\/.*hydrogen|@shopify\/hydrogen|storefront\.api/i.test(
                c.bundleLower + c.haystackLower
            ),
    },
    /* ─── Forums / community ─── */
    {
        name: 'Discourse',
        match: (c) => /discourse\.org|discourse-cdn|\/assets\/discourse/i.test(c.bundleLower),
    },
    {
        name: 'Flarum',
        match: (c) => /flarum\.js|flarum\/dist|flarum\/core/i.test(c.bundleLower + c.haystackLower),
    },
    {
        name: 'phpBB',
        match: (c) => /phpbb|\/styles\/prosilver|phpbb\.com/i.test(c.haystackLower),
    },
    {
        name: 'XenForo',
        match: (c) => /xenforo|js\/xf\//i.test(c.haystackLower),
    },
];

/**
 * Returns a deduplicated, order-stable list of detected platform names.
 */
export function collectDetectedPlatforms(input: PlatformDetectInput): string[] {
    const gen = (input.generatorMeta || '').toLowerCase();
    const ctx: Ctx = { ...input, gen };
    const out: string[] = [];
    const seen = new Set<string>();

    for (const rule of PLATFORM_RULES) {
        try {
            if (rule.match(ctx) && !seen.has(rule.name)) {
                seen.add(rule.name);
                out.push(rule.name);
            }
        } catch {
            /* ignore rule errors */
        }
    }

    return out;
}
