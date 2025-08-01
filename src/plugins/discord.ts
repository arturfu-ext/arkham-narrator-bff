import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ChannelType, Client, Events, GatewayIntentBits } from "discord.js";
import {
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
} from "@discordjs/voice";
import { Readable } from "node:stream";

const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const audioPlayer = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Play,
    maxMissedFrames: 3000,
  },
});

const TABLETOP_CHANNEL_ID = "1291440448761757838";

const getTabletopChannel = async () => await discordClient.channels.fetch(TABLETOP_CHANNEL_ID);

const getTabletopChannelConnection = async () => {
  const channel = await getTabletopChannel();
  if (channel?.type === ChannelType.GuildVoice) {
    return getVoiceConnection(channel.guild.id);
  }
};

const discordPlugin: FastifyPluginAsync = async (fastify) => {
  discordClient.once(Events.ClientReady, async (readyClient) => {
    fastify.log.info({ userTag: readyClient.user.tag }, "Discord client initialized.");
  });

  discordClient.on("error", (err) => {
    fastify.log.error({ err }, "Error initializing Discord client.");
  });

  await discordClient.login(fastify.config.DISCORD_TOKEN);

  const connect = async () => {
    fastify.log.info("Attempting to connect to voice channel.");

    if (discordClient) {
      const channel = await getTabletopChannel();
      if (channel && channel.isVoiceBased() && channel.joinable) {
        try {
          const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
          });

          connection.subscribe(audioPlayer);

          connection.on("error", (err) => {
            fastify.log.error({ err }, "Error connecting to voice channel.");
            connection.destroy();
          });
        } catch (error) {
          fastify.log.error({ error }, "Error joining voice channel.");
        }
      } else {
        fastify.log.error("Channel is not voice-based or not joinable.");
      }
    }
  };

  const disconnect = async () => {
    const connection = await getTabletopChannelConnection();
    connection?.destroy();
  };

  const play = async (readable: Readable) => {
    const connection = await getTabletopChannelConnection();

    if (!connection) {
      await connect();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const resource = createAudioResource(readable);
    audioPlayer.play(resource);
  };

  const stop = () => {
    return audioPlayer.stop();
  };

  const pause = () => {
    return audioPlayer.pause();
  };

  const unpause = () => {
    return audioPlayer.unpause();
  };

  const getConnectionStatus = async () => {
    const connection = await getTabletopChannelConnection();
    return connection?.state?.status;
  };

  const discord = { connect, disconnect, play, stop, pause, unpause, getConnectionStatus };

  fastify.addHook("onClose", async () => {
    const connection = await getTabletopChannelConnection();
    connection?.destroy();
    await discordClient.destroy();
  });

  fastify.decorate("discord", discord);
};

export default fp(discordPlugin, {
  name: "discord",
  dependencies: ["env"],
});
