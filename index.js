const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const PREFIX = "!";
const DEFAULT_CLAN = "VOTS"; // ton clan par défaut

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
    return data.data[0]?.id;
}

// 🔹 CLAN DATA
async function getClan(clanName) {
    const res = await fetch(`https://ps99.biggamesapi.io/api/clan/${clanName}`);
    const data = await res.json();
    return data.data;
}

// 🔹 RAP DATA
async function getRap() {
    const res = await fetch("https://ps99.biggamesapi.io/api/rap");
    return await res.json();
}

// 🔹 PET SEARCH
async function getPet(name) {
    const res = await fetch(`https://ps99.biggamesapi.io/api/rap`);
    const data = await res.json();

    return data.data.find(p => p.configData.name.toLowerCase().includes(name.toLowerCase()));
}

client.on("ready", () => {
    console.log("✅ Bot prêt");
});

client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) return;

    const args = message.content.slice(PREFIX.length).split(" ");
    const cmd = args.shift().toLowerCase();

    // ========================
    // 🔎 SEARCH PLAYER
    // ========================
    if (cmd === "search") {
        const username = args[0];
        if (!username) return message.reply("❌ pseudo manquant");

        const userId = await getUserId(username);
        const clan = await getClan(DEFAULT_CLAN);

        const members = clan.Contribution.Battle;
        const player = members.find(p => p.UserID == userId);

        if (!player) return message.reply("❌ pas dans le clan");

        const sorted = members.sort((a, b) => b.Points - a.Points);
        const rank = sorted.findIndex(p => p.UserID == userId) + 1;

        const embed = new EmbedBuilder()
            .setTitle(`🔎 ${username}`)
            .addFields(
                { name: "👑 Clan", value: DEFAULT_CLAN, inline: true },
                { name: "🏆 Rank", value: `#${rank}`, inline: true },
                { name: "🌸 Points", value: player.Points.toLocaleString(), inline: false }
            );

        message.reply({ embeds: [embed] });
    }

    // ========================
    // 👑 CLAN INFO
    // ========================
    if (cmd === "clan") {
        const clan = await getClan(DEFAULT_CLAN);

        const embed = new EmbedBuilder()
            .setTitle(`👑 Clan ${DEFAULT_CLAN}`)
            .addFields(
                { name: "👥 Membres", value: clan.Members.length.toString(), inline: true },
                { name: "🏆 Points", value: clan.Points.toLocaleString(), inline: true }
            );

        message.reply({ embeds: [embed] });
    }

    // ========================
    // 🔍 CLAN SEARCH
    // ========================
    if (cmd === "clansearch") {
        const clanName = args[0];
        if (!clanName) return message.reply("❌ nom clan");

        const clan = await getClan(clanName);

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Clan ${clanName}`)
            .addFields(
                { name: "👥 Membres", value: clan.Members.length.toString(), inline: true },
                { name: "🏆 Points", value: clan.Points.toLocaleString(), inline: true }
            );

        message.reply({ embeds: [embed] });
    }

    // ========================
    // 💰 RAP PLAYER
    // ========================
    if (cmd === "searchrap") {
        const username = args[0];
        if (!username) return message.reply("❌ pseudo");

        // ⚠️ pas dispo API → fake ou futur upgrade
        message.reply(`💰 RAP de ${username} : NON DISPONIBLE API`);
    }

    // ========================
    // 🐶 SEARCH PET
    // ========================
    if (cmd === "searchpet") {
        const name = args.join(" ");
        if (!name) return message.reply("❌ nom pet");

        const pet = await getPet(name);

        if (!pet) return message.reply("❌ pet introuvable");

        const embed = new EmbedBuilder()
            .setTitle(`🐶 ${pet.configData.name}`)
            .addFields(
                { name: "💰 RAP", value: pet.rap.toLocaleString(), inline: true },
                { name: "📦 Exist", value: pet.exist.toLocaleString(), inline: true }
            );

        message.reply({ embeds: [embed] });
    }

});

client.login("TOKEN");
