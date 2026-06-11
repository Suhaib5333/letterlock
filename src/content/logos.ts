import type { RawPack } from '../core/packs';

const logo = (slug: string): string => `https://cdn.simpleicons.org/${slug}`;
const PROMPT = 'Which brand does this logo belong to?';
function q(brand: string, slug: string, alt?: string[]) {
  return {
    q: PROMPT,
    a: brand,
    image: logo(slug),
    category: 'logos',
    ...(alt ? { alt } : {}),
  };
}

// ─────────────────────────────────────────────
// EASY  — ultra-famous global consumer brands
// ─────────────────────────────────────────────
export const logosEasyPack: RawPack = {
  id: 'logos-easy',
  name: 'Guess the Logo · Easy',
  description: 'Name the world-famous brand from its logo.',
  locale: 'en',
  difficulty: 'easy',
  contentRating: 'everyone',
  emoji: '🔵',
  accent: '#2563eb',
  hideBoardLetters: true,
  letters: {
    A: [
      q('Apple', 'apple'),
      q('Adidas', 'adidas'),
      q('Airbnb', 'airbnb'),
    ],
    B: [
      q('BMW', 'bmw'),
      q('Burger King', 'burgerking', ['BurgerKing', 'Burgerking']),
    ],
    C: [
      q('Coca-Cola', 'cocacola', ['Coca Cola', 'Coke']),
      q('Chrome', 'googlechrome', ['Google Chrome']),
    ],
    D: [
      q('Discord', 'discord'),
      q('Dropbox', 'dropbox'),
    ],
    E: [
      q('eBay', 'ebay'),
      q('Etsy', 'etsy'),
    ],
    F: [
      q('Facebook', 'facebook'),
      q('Ferrari', 'ferrari'),
      q('Figma', 'figma'),
    ],
    G: [
      q('Google', 'google'),
      q('GitHub', 'github', ['Github']),
    ],
    H: [
      q('Honda', 'honda'),
    ],
    I: [
      q('Instagram', 'instagram'),
      q('Intel', 'intel'),
      q('IKEA', 'ikea'),
    ],
    K: [
      q('KFC', 'kfc'),
    ],
    L: [
      q('Lamborghini', 'lamborghini'),
    ],
    M: [
      q("McDonald's", 'mcdonalds', ['McDonalds', 'Mcdonalds']),
    ],
    N: [
      q('Nike', 'nike'),
      q('Netflix', 'netflix'),
      q('Nvidia', 'nvidia'),
    ],
    O: [
    ],
    P: [
      q('PayPal', 'paypal', ['Paypal']),
      q('Pinterest', 'pinterest'),
      q('PlayStation', 'playstation'),
    ],
    Q: [
      q('Quora', 'quora'),
    ],
    R: [
      q('Reddit', 'reddit'),
    ],
    S: [
      q('Samsung', 'samsung'),
      q('Spotify', 'spotify'),
      q('Snapchat', 'snapchat'),
      q('Starbucks', 'starbucks'),
      q('Stripe', 'stripe'),
    ],
    T: [
      q('Toyota', 'toyota'),
      q('Tesla', 'tesla'),
      q('Telegram', 'telegram'),
      q('Twitch', 'twitch'),
    ],
    U: [
      q('Uber', 'uber'),
      q('Ubisoft', 'ubisoft'),
    ],
    V: [
      q('Visa', 'visa'),
      q('Volkswagen', 'volkswagen'),
      q('Vimeo', 'vimeo'),
    ],
    W: [
      q('WhatsApp', 'whatsapp', ['Whatsapp']),
      q('Wikipedia', 'wikipedia'),
    ],
    X: [
    ],
    Y: [
      q('YouTube', 'youtube', ['Youtube']),
    ],
    Z: [
      q('Zoom', 'zoom'),
    ],
  },
};

// ─────────────────────────────────────────────
// MEDIUM  — well-known but not ultra-household
// ─────────────────────────────────────────────
export const logosMediumPack: RawPack = {
  id: 'logos-medium',
  name: 'Guess the Logo · Medium',
  description: 'Name the brand from its logo — a bit trickier now.',
  locale: 'en',
  difficulty: 'medium',
  contentRating: 'everyone',
  emoji: '🟣',
  accent: '#7c3aed',
  hideBoardLetters: true,
  letters: {
    A: [
      q('Audi', 'audi'),
      q('Atlassian', 'atlassian'),
      q('Asana', 'asana'),
    ],
    B: [
      q('Behance', 'behance'),
      q('Bitbucket', 'bitbucket'),
      q('Blender', 'blender'),
    ],
    C: [
      q('Cloudflare', 'cloudflare'),
      q('Coinbase', 'coinbase'),
    ],
    D: [
      q('DoorDash', 'doordash', ['Doordash']),
      q('Duolingo', 'duolingo'),
      q('DigitalOcean', 'digitalocean', ['Digital Ocean']),
    ],
    E: [
      q('Epic Games', 'epicgames', ['EpicGames', 'Epic']),
    ],
    F: [
      q('Firefox', 'firefox'),
      q('Flipboard', 'flipboard'),
    ],
    G: [
      q('GitLab', 'gitlab', ['Gitlab']),
      q('GoDaddy', 'godaddy', ['Go Daddy']),
      q('Goodreads', 'goodreads'),
    ],
    H: [
      q('HubSpot', 'hubspot', ['Hubspot']),
    ],
    I: [
    ],
    J: [
      q('Jira', 'jira'),
    ],
    K: [
      q('Kickstarter', 'kickstarter'),
      q('Kotlin', 'kotlin'),
    ],
    L: [
      q('Lyft', 'lyft'),
      q('Linktree', 'linktree'),
    ],
    M: [
      q('Medium', 'medium'),
      q('Mailchimp', 'mailchimp'),
      q('MongoDB', 'mongodb', ['Mongo DB', 'Mongo']),
    ],
    N: [
      q('Notion', 'notion'),
      q('npm', 'npm', ['NPM']),
    ],
    O: [
      q('Opera', 'opera'),
    ],
    P: [
      q('Patreon', 'patreon'),
      q('Product Hunt', 'producthunt', ['ProductHunt']),
      q('Postman', 'postman'),
    ],
    R: [
      q('Robinhood', 'robinhood'),
      q('Revolut', 'revolut'),
    ],
    S: [
      q('Shopify', 'shopify'),
      q('SoundCloud', 'soundcloud', ['Sound Cloud']),
    ],
    T: [
      q('Trello', 'trello'),
      q('TikTok', 'tiktok', ['Tik Tok']),
    ],
    U: [
      q('Udemy', 'udemy'),
      q('Unity', 'unity'),
    ],
    V: [
      q('Vercel', 'vercel'),
    ],
    W: [
      q('Webpack', 'webpack'),
      q('WordPress', 'wordpress', ['Word Press']),
    ],
    X: [
      q('Xcode', 'xcode'),
    ],
    Y: [
      q('Yarn', 'yarn'),
      q('Yelp', 'yelp'),
    ],
    Z: [
      q('Zendesk', 'zendesk'),
    ],
  },
};

// ─────────────────────────────────────────────
// HARD  — developer tools, niche, and industry
// ─────────────────────────────────────────────
export const logosHardPack: RawPack = {
  id: 'logos-hard',
  name: 'Guess the Logo · Hard',
  description: 'Only true brand connoisseurs will ace this one.',
  locale: 'en',
  difficulty: 'hard',
  contentRating: 'everyone',
  emoji: '⚫',
  accent: '#111827',
  hideBoardLetters: true,
  letters: {
    A: [
      q('Ansible', 'ansible'),
      q('Apollo', 'apollographql', ['Apollo GraphQL', 'Apollo GraphQl']),
      q('Auth0', 'auth0'),
    ],
    B: [
      q('Babel', 'babel'),
      q('Brave', 'brave'),
    ],
    C: [
      q('Cypress', 'cypress'),
      q('CircleCI', 'circleci', ['Circle CI']),
      q('Contentful', 'contentful'),
    ],
    D: [
      q('Deno', 'deno'),
      q('Docker', 'docker'),
      q('Databricks', 'databricks'),
    ],
    E: [
      q('Elastic', 'elastic'),
      q('Expo', 'expo'),
    ],
    F: [
      q('Fastly', 'fastly'),
    ],
    G: [
      q('Grafana', 'grafana'),
      q('Gradle', 'gradle'),
    ],
    H: [
      q('Haskell', 'haskell'),
      q('Helm', 'helm'),
    ],
    I: [
      q('InfluxDB', 'influxdb', ['Influx DB', 'Influx']),
    ],
    J: [
      q('Jenkins', 'jenkins'),
      q('Jest', 'jest'),
    ],
    K: [
      q('Kubernetes', 'kubernetes', ['K8s']),
      q('Kafka', 'apachekafka', ['Apache Kafka']),
    ],
    L: [
      q('Laravel', 'laravel'),
      q('Lua', 'lua'),
    ],
    M: [
      q('MySQL', 'mysql', ['My SQL']),
      q('Mattermost', 'mattermost'),
    ],
    N: [
      q('Nginx', 'nginx'),
      q('Neo4j', 'neo4j'),
    ],
    O: [
    ],
    P: [
      q('Prisma', 'prisma'),
      q('Prometheus', 'prometheus'),
    ],
    R: [
      q('Rust', 'rust'),
      q('Redis', 'redis'),
      q('Rancher', 'rancher'),
    ],
    S: [
      q('Supabase', 'supabase'),
      q('Svelte', 'svelte'),
      q('Snowflake', 'snowflake'),
    ],
    T: [
      q('Terraform', 'terraform'),
      q('TypeScript', 'typescript', ['Typescript', 'TS']),
    ],
    U: [
      q('Ubuntu', 'ubuntu'),
    ],
    V: [
      q('Vault', 'vault', ['HashiCorp Vault']),
      q('Vite', 'vite'),
    ],
    W: [
      q('Webflow', 'webflow'),
    ],
    X: [
    ],
    Y: [
    ],
    Z: [
      q('Zsh', 'zsh'),
    ],
  },
};
