
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  throw new Error("Missing BOT_TOKEN or CLIENT_ID in Railway Variables.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const commands = [
  new SlashCommandBuilder().setName("setup").setDescription("Create the FREEVAULT server layout"),
  new SlashCommandBuilder().setName("help").setDescription("Show all bot commands"),
  new SlashCommandBuilder().setName("freebies").setDescription("Post a free resource")
    .addStringOption(o => o.setName("name").setDescription("Resource name").setRequired(true))
    .addStringOption(o => o.setName("link").setDescription("Resource link").setRequired(true)),
  new SlashCommandBuilder().setName("submit").setDescription("Submit a free resource")
    .addStringOption(o => o.setName("details").setDescription("What are you submitting?").setRequired(true)),
  new SlashCommandBuilder().setName("request").setDescription("Request a free resource")
    .addStringOption(o => o.setName("details").setDescription("What do you need?").setRequired(true)),
  new SlashCommandBuilder().setName("ticket").setDescription("Open a private support ticket"),
  new SlashCommandBuilder().setName("giveaway").setDescription("Start a giveaway")
    .addStringOption(o => o.setName("prize").setDescription("Giveaway prize").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Duration in minutes").setRequired(true).setMinValue(1)),
  new SlashCommandBuilder().setName("announce").setDescription("Send an announcement")
    .addStringOption(o => o.setName("message").setDescription("Announcement text").setRequired(true)),
  new SlashCommandBuilder().setName("ban").setDescription("Ban a member")
    .addUserOption(o => o.setName("user").setDescription("Member to ban").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason")),
  new SlashCommandBuilder().setName("kick").setDescription("Kick a member")
    .addUserOption(o => o.setName("user").setDescription("Member to kick").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason")),
  new SlashCommandBuilder().setName("timeout").setDescription("Timeout a member")
    .addUserOption(o => o.setName("user").setDescription("Member to timeout").setRequired(true))
    .addIntegerOption(o => o.setName("minutes").setDescription("Timeout length").setRequired(true).setMinValue(1).setMaxValue(40320))
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

client.once("ready", async () => {
  console.log(`${client.user.tag} is online!`);

  try {
    const data = commands.map(command => command.toJSON());

    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: data });
      console.log("Guild commands registered.");
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: data });
      console.log("Global commands registered. They may take a while to appear.");
    }
  } catch (error) {
    console.error("Command registration failed:", error);
  }
});

client.on("guildMemberAdd", async member => {
  try {
    const role = member.guild.roles.cache.find(r => r.name === "Member");
    if (role) await member.roles.add(role);

    const welcome = member.guild.channels.cache.find(c => c.name === "welcome");
    if (welcome) {
      await welcome.send(`Welcome ${member} to **${member.guild.name}**! 🎉`);
    }
  } catch (error) {
    console.error("Welcome/autorole error:", error);
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guild, member, options } = interaction;
  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

  try {
    if (commandName === "help") {
      const embed = new EmbedBuilder()
        .setTitle("FREEVAULT BOT — Commands")
        .setColor(0x5865F2)
        .setDescription(
          "`/setup` — Create server layout\n" +
          "`/freebies` — Post a free resource\n" +
          "`/submit` — Submit a resource\n" +
          "`/request` — Request a resource\n" +
          "`/ticket` — Open a support ticket\n" +
          "`/giveaway` — Start a giveaway\n" +
          "`/announce` — Send an announcement\n" +
          "`/ban`, `/kick`, `/timeout` — Moderation"
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === "setup") {
      if (!isAdmin) return interaction.reply({ content: "You need Administrator permission.", ephemeral: true });

      await interaction.deferReply({ ephemeral: true });

      const categories = [
        { name: "📌 INFORMATION", channels: ["welcome", "rules", "announcements"] },
        { name: "🎁 FREEVAULT", channels: ["freebies", "submissions", "requests"] },
        { name: "💬 COMMUNITY", channels: ["general", "media", "bot-commands"] },
        { name: "🎫 SUPPORT", channels: ["support-info"] }
      ];

      if (!guild.roles.cache.find(r => r.name === "Member")) {
        await guild.roles.create({ name: "Member", color: 0x5865F2 });
      }
      if (!guild.roles.cache.find(r => r.name === "Giveaway Winner")) {
        await guild.roles.create({ name: "Giveaway Winner", color: 0xF1C40F });
      }

      for (const group of categories) {
        let category = guild.channels.cache.find(
          c => c.type === ChannelType.GuildCategory && c.name === group.name
        );

        if (!category) {
          category = await guild.channels.create({
            name: group.name,
            type: ChannelType.GuildCategory
          });
        }

        for (const channelName of group.channels) {
          if (!guild.channels.cache.find(c => c.name === channelName && c.parentId === category.id)) {
            await guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: category.id
            });
          }
        }
      }

      return interaction.editReply("✅ FREEVAULT channels and roles have been created!");
    }

    if (commandName === "freebies") {
      const name = options.getString("name");
      const link = options.getString("link");
      const embed = new EmbedBuilder()
        .setTitle(`🎁 ${name}`)
        .setDescription(`[Get it here](${link})`)
        .setColor(0x2ECC71)
        .setFooter({ text: "FREEVAULT — Free resources" });
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === "submit" || commandName === "request") {
      const channelName = commandName === "submit" ? "submissions" : "requests";
      const channel = guild.channels.cache.find(c => c.name === channelName);
      if (!channel) return interaction.reply({ content: `Please run /setup first. I couldn't find #${channelName}.`, ephemeral: true });

      await channel.send(`**${commandName === "submit" ? "New submission" : "New request"} from ${interaction.user}**\n${options.getString("details")}`);
      return interaction.reply({ content: "✅ Your message has been sent!", ephemeral: true });
    }

    if (commandName === "ticket") {
      const existing = guild.channels.cache.find(c =>
        c.name === `ticket-${interaction.user.id}`
      );
      if (existing) return interaction.reply({ content: `You already have a ticket: ${existing}`, ephemeral: true });

      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
        ]
      });

      await channel.send(`Hello ${interaction.user}! Staff will help you here. 🔒`);
      return interaction.reply({ content: `Your private ticket is ready: ${channel}`, ephemeral: true });
    }

    if (commandName === "giveaway") {
      if (!isAdmin) return interaction.reply({ content: "You need Administrator permission.", ephemeral: true });

      const prize = options.getString("prize");
      const minutes = options.getInteger("minutes");
      const message = await interaction.reply({
        content: `🎉 **GIVEAWAY: ${prize}**\nReact with 🎉 to enter!\nWinner chosen in ${minutes} minute(s).`,
        fetchReply: true
      });

      await message.react("🎉");
      setTimeout(async () => {
        try {
          const finished = await message.fetch();
          const reaction = finished.reactions.cache.get("🎉");
          const users = reaction ? await reaction.users.fetch() : null;
          const entrants = users ? users.filter(u => !u.bot).map(u => u) : [];
          if (!entrants.length) return finished.reply("No one entered this giveaway.");
          const winner = entrants[Math.floor(Math.random() * entrants.length)];
          await finished.reply(`🎊 Congratulations ${winner}! You won **${prize}**!`);
          const winnerRole = guild.roles.cache.find(r => r.name === "Giveaway Winner");
          const winnerMember = await guild.members.fetch(winner.id).catch(() => null);
          if (winnerRole && winnerMember) await winnerMember.roles.add(winnerRole).catch(() => {});
        } catch (error) {
          console.error("Giveaway error:", error);
        }
      }, minutes * 60 * 1000);

      return;
    }

    if (commandName === "announce") {
      if (!isAdmin) return interaction.reply({ content: "You need Administrator permission.", ephemeral: true });
      const channel = guild.channels.cache.find(c => c.name === "announcements");
      if (!channel) return interaction.reply({ content: "Run /setup first to create #announcements.", ephemeral: true });
      await channel.send({ embeds: [new EmbedBuilder().setTitle("📢 Announcement").setDescription(options.getString("message")).setColor(0x5865F2)] });
      return interaction.reply({ content: "✅ Announcement posted!", ephemeral: true });
    }

    if (["ban", "kick", "timeout"].includes(commandName)) {
      if (!isAdmin) return interaction.reply({ content: "You need Administrator permission.", ephemeral: true });

      const user = options.getUser("user");
      const target = await guild.members.fetch(user.id).catch(() => null);
      if (!target) return interaction.reply({ content: "I couldn't find that server member.", ephemeral: true });

      const reason = options.getString("reason") || `Action by ${interaction.user.tag}`;

      if (commandName === "ban") await target.ban({ reason });
      if (commandName === "kick") await target.kick(reason);
      if (commandName === "timeout") {
        const minutes = options.getInteger("minutes");
        await target.timeout(minutes * 60 * 1000, reason);
      }

      return interaction.reply({ content: `✅ ${user.tag} has been ${commandName === "timeout" ? "timed out" : commandName + "ned"}.`, ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    const message = { content: "Something went wrong. Check the bot permissions and Railway logs.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(message).catch(() => {});
    } else {
      await interaction.reply(message).catch(() => {});
    }
  }
});

client.login(TOKEN);
