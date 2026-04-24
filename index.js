const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const fetch = global.fetch; // ✅ fetch intégré Node 18+

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const PREFIX = "!";
const DEFAULT_CLAN = "VOTS";

// 🔹 USERNAME → USERID
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

// 🔹 CLAN
async function getClan(clanName) {
    const res = await fetch(`https://ps99.biggamesapi.io/api/clan/${clanName}`);
    const data = await res.json();
    return data?.data;
}

// 🔹 PET SAFE SEARCH
async function getPet(name) {
    const res = await fetch(`https://ps99.biggamesapi.io/api/rap`);
    const data = await res.json();

    const list = data?.data || data;

    return list?.find(p =>
        p?.configData?.name?.toLowerCase().includes(name.toLowerCase())
    );
}

client.on("ready", () => {
    console.log("✅ Bot prêt");
});

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

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

    if (cmd === "clan") {
        const clan = await getClan(DEFAULT_CLAN);
        if (!clan) return message.reply("❌ clan introuvable");

        const embed = new EmbedBuilder()
            .setTitle(`👑 Clan ${DEFAULT_CLAN}`)
            .addFields(
                { name: "👥 Membres", value: String(clan.Members?.length || 0), inline: true },
                { name: "🏆 Points", value: String(clan.Points || 0), inline: true }
            );

        message.reply({ embeds: [embed] });
    }

    if (cmd === "clansearch") {
        const clanName = args[0];
        if (!clanName) return message.reply("❌ nom clan");

        const clan = await getClan(clanName);
        if (!clan) return message.reply("❌ clan introuvable");

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Clan ${clanName}`)
            .addFields(
                { name: "👥 Membres", value: String(clan.Members?.length || 0), inline: true },
                { name: "🏆 Points", value: String(clan.Points || 0), inline: true }
            );

        message.reply({ embeds: [embed] });
    }

    if (cmd === "searchrap") {
        const username = args[0];
        if (!username) return message.reply("❌ pseudo");

        message.reply(`💰 RAP de ${username} : API pas dispo`);
    }

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

// ✅ Token via Railway ENV
client.login(process.env.TOKEN);
