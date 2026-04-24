const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const fetch = global.fetch;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = "!";
const DEFAULT_CLAN = "VOTS";

// =======================
// UTILS
// =======================
function formatNumber(num) {
    if (!num) return "0";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
}

// =======================
// ROBLOX USERNAMES
// =======================
async function getUsernames(userIds) {
    if (!userIds.length) return {};

    try {
        const res = await fetch("https://users.roblox.com/v1/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds })
        });

        const data = await res.json();

        const map = {};
        (data.data || []).forEach(u => {
            map[u.id] = u.name;
        });

        return map;
    } catch {
        return {};
    }
}

// =======================
// EMBED CLAN
// =======================
async function buildClanEmbed(clan, page = 1) {
    const perPage = 10;
    const eventName = "Spring2026";

    // 🔥 DATA SAFE
    const members =
        clan?.Contribution?.Battle ||
        clan?.Battle ||
        clan?.battle ||
        [];

    const clanPoints =
        clan?.Points ||
        clan?.points ||
        clan?.BattlePoints ||
        clan?.battlePoints ||
        0;

    const sorted = [...members].sort((a, b) => (b.Points || 0) - (a.Points || 0));

    const start = (page - 1) * perPage;
    const current = sorted.slice(start, start + perPage);

    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

    // 🔥 usernames
    const ids = current.map(p => p.UserID).filter(Boolean);
    const usernames = await getUsernames(ids);

    const list = current.map((p, i) => {
        const rank = start + i + 1;
        const username = usernames[p.UserID] || `User ${p.UserID}`;
        const points = p.Points || 0;

        return `#${rank} **${username}** — ${formatNumber(points)}⭐`;
    }).join("\n");

    return new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`🇫🇷 ${DEFAULT_CLAN}`)
        .setDescription(
`*Guys under 1m point add lynox10 on dc or kick*

👥 **Members**      🏆 **Place**      🤝 **Contributors**
${clan?.Members?.length || 0} / 75        #${clan?.Rank || "??"}        ${members.length} / ${clan?.Members?.length || 0}

⚔️ **${eventName} Points**
${Number(clanPoints).toLocaleString()}⭐

📊 **Contributors — ${eventName} • Page ${page}/${totalPages}**

${list || "Aucun contributeur"}`
        )
        .setFooter({ text: "Pet Simulator 99 • biggamesapi.io" });
}

// =======================
// API
// =======================
async function getUserId(username) {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            usernames: [username],
            excludeBannedUsers: true
        })
    });

    const data = await res.json();
    return data?.data?.[0]?.id;
}

async function getClan(clanName) {
    const res = await fetch(`https://ps99.biggamesapi.io/api/clan/${clanName}`);
    const data = await res.json();
    return data?.data;
}

async function getPet(name) {
    const res = await fetch(`https://ps99.biggamesapi.io/api/rap`);
    const data = await res.json();

    const list = data?.data || data;

    return list?.find(p =>
        p?.configData?.name?.toLowerCase().includes(name.toLowerCase())
    );
}

// =======================
// READY
// =======================
client.on("ready", () => {
    console.log("✅ Bot prêt");
});

// =======================
// COMMANDES
// =======================
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ========================
    // CLAN
    // ========================
    if (cmd === "clan") {
        const clan = await getClan(DEFAULT_CLAN);
        if (!clan) return message.reply("❌ clan introuvable");

        let page = 1;

        const embed = await buildClanEmbed(clan, page);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("prev")
                .setLabel("⬅️ Prev")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId("next")
                .setLabel("➡️ Next")
                .setStyle(ButtonStyle.Primary)
        );

        const msg = await message.reply({
            embeds: [embed],
            components: [row]
        });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: "❌ Pas ton menu", ephemeral: true });
            }

            if (interaction.customId === "prev") page--;
            if (interaction.customId === "next") page++;

            const maxPage = Math.max(1, Math.ceil(
                (clan?.Contribution?.Battle?.length || 1) / 10
            ));

            if (page < 1) page = 1;
            if (page > maxPage) page = maxPage;

            const newEmbed = await buildClanEmbed(clan, page);
            await interaction.update({ embeds: [newEmbed] });
        });
    }

    // ========================
    // PET
    // ========================
    if (cmd === "searchpet") {
        const name = args.join(" ");
        if (!name) return message.reply("❌ nom pet");

        const pet = await getPet(name);
        if (!pet) return message.reply("❌ pet introuvable");

        const embed = new EmbedBuilder()
            .setTitle(`🐶 ${pet.configData?.name || "Unknown"}`)
            .addFields(
                { name: "💰 RAP", value: String(pet.rap || 0), inline: true },
                { name: "📦 Exist", value: String(pet.exist || 0), inline: true }
            );

        message.reply({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
