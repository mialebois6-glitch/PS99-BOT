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
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toString();
}

// =======================
// EMBED CLAN (FIX)
// =======================
function buildClanEmbed(clan, page = 1) {
    const perPage = 10;
    const eventName = "Spring2026";

    // 🔥 FIX DATA ROBUSTE
    const members = clan?.Contribution?.Battle 
        || clan?.Members 
        || clan?.members 
        || [];

    const sorted = [...members].sort((a, b) => (b.Points || b.points || 0) - (a.Points || a.points || 0));

    const start = (page - 1) * perPage;
    const current = sorted.slice(start, start + perPage);

    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

    const list = current.map((p, i) => {
        const rank = start + i + 1;

        const username = p.Username || p.username || p.Name || "Unknown";
        const points = p.Points || p.points || 0;

        return `#${rank} **${username}** — ${formatNumber(points)}⭐`;
    }).join("\n");

    return new EmbedBuilder()
        .setColor("#2b2d31")
        .setTitle(`🇫🇷 ${DEFAULT_CLAN}`)
        .setDescription(
`*Guys under 1m point add lynox10 on dc or kick*

👥 **Members**      🏆 **Place**      🤝 **Contributors**
${clan.Members?.length || clan.members?.length || 0} / 75        #${clan.Rank || clan.rank || "??"}        ${members.length} / ${clan.Members?.length || clan.members?.length || 0}

⚔️ **${eventName} Points**
${clan.Points?.toLocaleString() || clan.points || 0}⭐

📊 **Contributors — ${eventName} • Page ${page}/${totalPages}**

${list || "Aucun contributeur trouvé"}`
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

    // 🔎 SEARCH
    if (cmd === "search") {
        const username = args[0];
        if (!username) return message.reply("❌ pseudo manquant");

        try {
            const userId = await getUserId(username);
            const clan = await getClan(DEFAULT_CLAN);

            if (!clan) return message.reply("❌ clan introuvable");

            const members = clan?.Contribution?.Battle || [];
            const player = members.find(p => p.UserID == userId);

            if (!player) return message.reply("❌ pas dans le clan");

            const sorted = [...members].sort((a, b) => b.Points - a.Points);
            const rank = sorted.findIndex(p => p.UserID == userId) + 1;

            const embed = new EmbedBuilder()
                .setTitle(`🔎 ${username}`)
                .addFields(
                    { name: "👑 Clan", value: DEFAULT_CLAN, inline: true },
                    { name: "🏆 Rank", value: `#${rank}`, inline: true },
                    { name: "🌸 Points", value: String(player.Points), inline: false }
                );

            message.reply({ embeds: [embed] });

        } catch (err) {
            console.error(err);
            message.reply("❌ erreur search");
        }
    }

    // 👑 CLAN
    if (cmd === "clan") {
        const clan = await getClan(DEFAULT_CLAN);
        if (!clan) return message.reply("❌ clan introuvable");

        let page = 1;

        const embed = buildClanEmbed(clan, page);

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

            const maxPage = Math.ceil((clan?.Contribution?.Battle?.length || 10) / 10);

            if (page < 1) page = 1;
            if (page > maxPage) page = maxPage;

            const newEmbed = buildClanEmbed(clan, page);
            await interaction.update({ embeds: [newEmbed] });
        });
    }

    // 🐶 PET
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
