import { PrismaClient } from '@prisma/client';

// ─── helpers ────────────────────────────────────────────────────────────────

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── data ────────────────────────────────────────────────────────────────────
// Structure:
//   { name, icon, children? }
//
// Icons are emojis — swap for your CDN path strings if you prefer.
// All slugs are auto-generated from the name.

const CATEGORY_TREE = [
  {
    name: 'Electronics',
    icon: '📱',
    children: [
      {
        name: 'Mobiles & Tablets',
        icon: '📲',
        children: [
          { name: 'Smartphones', icon: '📱' },
          { name: 'Tablets', icon: '📟' },
          { name: 'Mobile Accessories', icon: '🔌' },
          { name: 'Cases & Covers', icon: '🧳' },
        ],
      },
      {
        name: 'Laptops & Computers',
        icon: '💻',
        children: [
          { name: 'Laptops', icon: '💻' },
          { name: 'Desktops', icon: '🖥️' },
          { name: 'Monitors', icon: '🖥️' },
          { name: 'Keyboards & Mice', icon: '⌨️' },
          { name: 'Storage & Drives', icon: '💾' },
        ],
      },
      {
        name: 'Audio & Headphones',
        icon: '🎧',
        children: [
          { name: 'Earbuds & TWS', icon: '🎧' },
          { name: 'Over-Ear Headphones', icon: '🎧' },
          { name: 'Bluetooth Speakers', icon: '🔊' },
          { name: 'Home Theatre', icon: '🎬' },
        ],
      },
      {
        name: 'Cameras & Photography',
        icon: '📷',
        children: [
          { name: 'DSLR Cameras', icon: '📷' },
          { name: 'Mirrorless Cameras', icon: '📸' },
          { name: 'Action Cameras', icon: '🎥' },
          { name: 'Lenses & Filters', icon: '🔭' },
        ],
      },
      {
        name: 'Wearables',
        icon: '⌚',
        children: [
          { name: 'Smart Watches', icon: '⌚' },
          { name: 'Fitness Bands', icon: '💪' },
          { name: 'Smart Glasses', icon: '🕶️' },
        ],
      },
      {
        name: 'TV & Home Entertainment',
        icon: '📺',
        children: [
          { name: 'Televisions', icon: '📺' },
          { name: 'Streaming Devices', icon: '📡' },
          { name: 'Projectors', icon: '🎬' },
        ],
      },
    ],
  },
  {
    name: 'Fashion',
    icon: '👗',
    children: [
      {
        name: "Men's Clothing",
        icon: '👔',
        children: [
          { name: 'T-Shirts & Polos', icon: '👕' },
          { name: 'Shirts', icon: '👔' },
          { name: 'Jeans & Trousers', icon: '👖' },
          { name: 'Ethnic Wear', icon: '🧥' },
          { name: 'Winter Wear', icon: '🧥' },
        ],
      },
      {
        name: "Women's Clothing",
        icon: '👗',
        children: [
          { name: 'Sarees', icon: '🥻' },
          { name: 'Kurtas & Suits', icon: '👘' },
          { name: 'Dresses & Tops', icon: '👗' },
          { name: 'Lehengas', icon: '🥻' },
          { name: 'Winter Wear', icon: '🧥' },
        ],
      },
      {
        name: 'Footwear',
        icon: '👟',
        children: [
          { name: "Men's Shoes", icon: '👞' },
          { name: "Women's Shoes", icon: '👠' },
          { name: 'Sports Shoes', icon: '👟' },
          { name: 'Sandals & Slippers', icon: '🩴' },
        ],
      },
      {
        name: 'Accessories',
        icon: '👜',
        children: [
          { name: 'Bags & Wallets', icon: '👜' },
          { name: 'Sunglasses', icon: '🕶️' },
          { name: 'Watches', icon: '⌚' },
          { name: 'Jewellery', icon: '💍' },
          { name: 'Belts & Caps', icon: '🧢' },
        ],
      },
    ],
  },
  {
    name: 'Grocery & Staples',
    icon: '🛒',
    children: [
      {
        name: 'Fruits & Vegetables',
        icon: '🥦',
        children: [
          { name: 'Fresh Fruits', icon: '🍎' },
          { name: 'Fresh Vegetables', icon: '🥦' },
          { name: 'Herbs & Seasonings', icon: '🌿' },
        ],
      },
      {
        name: 'Dairy, Bread & Eggs',
        icon: '🥛',
        children: [
          { name: 'Milk & Paneer', icon: '🥛' },
          { name: 'Curd & Butter', icon: '🧈' },
          { name: 'Eggs', icon: '🥚' },
          { name: 'Bread & Bakery', icon: '🍞' },
        ],
      },
      {
        name: 'Staples & Pantry',
        icon: '🌾',
        children: [
          { name: 'Atta, Rice & Dal', icon: '🌾' },
          { name: 'Oils & Ghee', icon: '🫙' },
          { name: 'Spices & Masalas', icon: '🌶️' },
          { name: 'Sugar, Salt & Jaggery', icon: '🧂' },
        ],
      },
      {
        name: 'Snacks & Beverages',
        icon: '☕',
        children: [
          { name: 'Tea & Coffee', icon: '☕' },
          { name: 'Cold Drinks & Juices', icon: '🧃' },
          { name: 'Biscuits & Chips', icon: '🍪' },
          { name: 'Noodles & Pasta', icon: '🍜' },
        ],
      },
    ],
  },
  {
    name: 'Home & Kitchen',
    icon: '🏠',
    children: [
      {
        name: 'Kitchen Appliances',
        icon: '🍳',
        children: [
          { name: 'Mixer Grinders', icon: '🥤' },
          { name: 'Microwave Ovens', icon: '📦' },
          { name: 'Air Fryers', icon: '🍳' },
          { name: 'Induction Cooktops', icon: '🔥' },
        ],
      },
      {
        name: 'Cookware & Dining',
        icon: '🍽️',
        children: [
          { name: 'Pots & Pans', icon: '🥘' },
          { name: 'Dinner Sets', icon: '🍽️' },
          { name: 'Pressure Cookers', icon: '♨️' },
          { name: 'Lunch Boxes', icon: '📦' },
        ],
      },
      {
        name: 'Home Decor',
        icon: '🪴',
        children: [
          { name: 'Curtains & Cushions', icon: '🪟' },
          { name: 'Wall Art & Clocks', icon: '🕰️' },
          { name: 'Plants & Pots', icon: '🪴' },
          { name: 'Lighting & Lamps', icon: '💡' },
        ],
      },
      {
        name: 'Cleaning & Laundry',
        icon: '🧹',
        children: [
          { name: 'Detergents & Cleaners', icon: '🧴' },
          { name: 'Mops & Brooms', icon: '🧹' },
          { name: 'Washing Machines', icon: '🌀' },
        ],
      },
    ],
  },
  {
    name: 'Beauty & Personal Care',
    icon: '💄',
    children: [
      {
        name: 'Skin Care',
        icon: '🧴',
        children: [
          { name: 'Moisturizers & Serums', icon: '🧴' },
          { name: 'Sunscreen', icon: '☀️' },
          { name: 'Face Wash & Scrubs', icon: '🫧' },
        ],
      },
      {
        name: 'Hair Care',
        icon: '💆',
        children: [
          { name: 'Shampoo & Conditioner', icon: '🚿' },
          { name: 'Hair Oils & Serums', icon: '💧' },
          { name: 'Hair Styling Tools', icon: '💇' },
        ],
      },
      {
        name: 'Makeup',
        icon: '💄',
        children: [
          { name: 'Lipsticks & Glosses', icon: '💋' },
          { name: 'Foundation & Concealer', icon: '🪞' },
          { name: 'Eye Makeup', icon: '👁️' },
        ],
      },
      {
        name: 'Fragrances',
        icon: '🌸',
        children: [
          { name: "Men's Perfumes", icon: '🧴' },
          { name: "Women's Perfumes", icon: '🌸' },
          { name: 'Deodorants', icon: '🌬️' },
        ],
      },
    ],
  },
  {
    name: 'Sports & Fitness',
    icon: '🏋️',
    children: [
      {
        name: 'Exercise & Gym',
        icon: '💪',
        children: [
          { name: 'Dumbbells & Barbells', icon: '🏋️' },
          { name: 'Resistance Bands', icon: '🔗' },
          { name: 'Yoga Mats & Blocks', icon: '🧘' },
          { name: 'Treadmills & Cycles', icon: '🚴' },
        ],
      },
      {
        name: 'Outdoor Sports',
        icon: '⚽',
        children: [
          { name: 'Cricket', icon: '🏏' },
          { name: 'Football & Basketball', icon: '⚽' },
          { name: 'Badminton & Tennis', icon: '🏸' },
          { name: 'Cycling', icon: '🚴' },
        ],
      },
      {
        name: 'Sports Nutrition',
        icon: '🥤',
        children: [
          { name: 'Protein Supplements', icon: '💪' },
          { name: 'Pre-Workout', icon: '⚡' },
          { name: 'Vitamins & Minerals', icon: '💊' },
        ],
      },
    ],
  },
  {
    name: 'Books & Stationery',
    icon: '📚',
    children: [
      {
        name: 'Books',
        icon: '📖',
        children: [
          { name: 'Fiction', icon: '📖' },
          { name: 'Non-Fiction', icon: '📗' },
          { name: 'Academic & Textbooks', icon: '🎓' },
          { name: "Children's Books", icon: '📚' },
        ],
      },
      {
        name: 'Stationery & Office',
        icon: '✏️',
        children: [
          { name: 'Pens & Markers', icon: '✏️' },
          { name: 'Notebooks & Diaries', icon: '📓' },
          { name: 'Art & Craft Supplies', icon: '🎨' },
        ],
      },
    ],
  },
  {
    name: 'Toys & Baby',
    icon: '🧸',
    children: [
      {
        name: 'Toys & Games',
        icon: '🎮',
        children: [
          { name: 'Board Games', icon: '🎲' },
          { name: 'Action Figures', icon: '🦸' },
          { name: 'Educational Toys', icon: '🧩' },
          { name: 'Remote Control Toys', icon: '🚗' },
        ],
      },
      {
        name: 'Baby Care',
        icon: '👶',
        children: [
          { name: 'Diapers & Wipes', icon: '🧻' },
          { name: 'Baby Food', icon: '🍼' },
          { name: 'Baby Clothing', icon: '👶' },
          { name: 'Strollers & Car Seats', icon: '🛺' },
        ],
      },
    ],
  },
];

// ─── seeder ──────────────────────────────────────────────────────────────────

type LeafInput = { name: string; icon: string };
type NodeInput = LeafInput & { children?: NodeInput[] };

async function insertNode(
  prisma: PrismaClient,
  node: NodeInput,
  parentId: string | null,
  depth: number,
): Promise<void> {
  const nodeSlug = slug(node.name);

  // upsert — safe to re-run the seeder without duplicates
  const record = await prisma.category.upsert({
    where: { slug: nodeSlug },
    update: {}, // already exists → skip
    create: {
      name: node.name,
      slug: nodeSlug,
      iconUrl: node.icon,
      isActive: true,
      ...(parentId ? { parentId } : {}),
    },
  });

  const indent = '  '.repeat(depth);
  console.log(`${indent}✅ ${node.name}`);

  if (node.children?.length) {
    for (const child of node.children) {
      await insertNode(prisma, child, record.id, depth + 1);
    }
  }
}

export async function seedCategories(prisma: PrismaClient): Promise<void> {
  console.log('📦 Seeding categories...\n');

  for (const root of CATEGORY_TREE) {
    await insertNode(prisma, root as NodeInput, null, 0);
    console.log('');
  }

  const total = await prisma.category.count();
  console.log(`\n✅ Done — ${total} categories in DB`);
}
