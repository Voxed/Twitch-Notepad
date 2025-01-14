

import { gql } from '@/gql/7tv'
import { ApolloClient, InMemoryCache, ApolloProvider, NormalizedCacheObject } from '@apollo/client';

const GET_USER_EMOTES = gql(`
  query Users($channelId: String!) {
      users {
          userByConnection(platform: TWITCH, platformId: $channelId) {
              style {
                  activeEmoteSet {
                      emotes {
                          items {
                              alias
                              emote {
                                  images {
                                      height
                                      width
                                      url
                                      scale
                                      mime
                                      size
                                      frameCount
                                  }
                                  defaultName
                                  flags {
                                      animated
                                  }
                              }
                          }
                      }
                  }
              }
          }
      }
  }`);

interface EmoteImage {
  width: number, height: number,
  url: string
}

interface Emote {
  name: string,
  images: EmoteImage[]
}

export default class EmoteHelper {
  readonly stvServer: ApolloClient<NormalizedCacheObject>;
  overrideChannelId: string | undefined

  constructor(readonly twitchAuth: Twitch.ext.Authorized, readonly overrideChannelName: string | undefined = undefined) {
    this.stvServer = new ApolloClient({ uri: 'https://7tv.io/v4/gql', cache: new InMemoryCache() });
  }

  async init() {
    if (this.overrideChannelName)
      this.overrideChannelId = (await this.#twitchApiRequest('users', new URLSearchParams({ login: this.overrideChannelName }))).data[0].id
    const emotes: Emote[] = (await Promise.all([
      this.#fetch7tvEmotes(),
      this.#fetchTwitchEmotes()
    ])).flat()
    console.log(emotes)
  }


  async #twitchApiRequest(endpoint: string, params: URLSearchParams = new URLSearchParams({}), method: string = 'GET') {
    const response = await fetch('https://api.twitch.tv/helix/' + endpoint + "?" + params, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'client-id': this.twitchAuth.clientId,
        'Authorization': 'Extension ' + this.twitchAuth.helixToken
      }
    });
    return await response.json()
  }

  async #fetch7tvEmotes(): Promise<Emote[]> {
    const response = await this.stvServer.query({ query: GET_USER_EMOTES, variables: { channelId: this.overrideChannelId || this.twitchAuth.channelId } })
    return (response.data.users.userByConnection?.style.activeEmoteSet?.emotes.items || []).map((emote) => ({
      name: emote.alias,
      images: emote.emote.images.reduce((acc, obj) =>
        (!emote.emote.flags.animated || obj.frameCount > 1) && obj.mime === 'image/avif' ? acc.concat([obj]) : acc
        , [] as EmoteImage[])
    }))
  }

  async #fetchTwitchEmotes(): Promise<Emote[]> {
    const response = (await this.#twitchApiRequest('chat/emotes', new URLSearchParams({ broadcaster_id: this.overrideChannelId || this.twitchAuth.channelId })))
    console.log(response)
    return []
  }

}

async function getUserActiveEmotes(userId: string) {
  const query = `
query Users($userId: Id!) {
users {
  user(id: $userId) {
    style {
      activeEmoteSet {
        emotes {
          items {
            alias
            emote {
              images {
                height
                width
                url
                scale
                mime
                size
                frameCount
              }
              defaultName
              flags {
                animated
              }
            }
          }
        }
      }
    }
  }
}
}`;

  const variables = { userId };

  try {
    const response = await fetch('https://7tv.io/v4/gql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    if (json.errors) {
      console.error('7TV GraphQL errors:', json.errors);
      return null;
    }

    // If user wasn't found, userByConnection could be null
    return json.data.users.user.style.activeEmoteSet.emotes.items;
  } catch (err) {
    console.error('Network/Fetch error:', err);
    return null;
  }
}
/*
window.Twitch.ext.onAuthorized(async (auth) => {
  console.log(auth)
  console.log({ 'Content-Type': 'application/json', 'client-id': auth.clientId, 'Authorization': 'Extension ' + auth.helixToken })
  async function apiRequest(endpoint: string) {
    const response = await fetch('https://api.twitch.tv/helix/' + endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'client-id': auth.clientId, 'Authorization': 'Extension ' + auth.helixToken }
    });
    return await response.json()
  }

  // get channel emotes
  var twemotes = (await apiRequest('chat/emotes?broadcaster_id=' + auth.channelId))
  console.log(twemotes)
  //get global emotes
  var twglobalemotes = (await apiRequest('chat/emotes/global'))
  //get STV channel emotes
  var stvid = (await getUserByConnection('TWITCH', auth.channelId)).id
  const stvemotes = await getUserActiveEmotes(stvid)
  //get bttv emotes
  var bttvemotes = await (await fetch("https://api.betterttv.net/3/cached/emotes/global")).json()
  var emotes = {}
  function getEmotes() {
    //add the BTTV emote
    bttvemotes.forEach(bttvemote => {
      emotes[bttvemote.code] = { url: `https://cdn.betterttv.net/emote/${bttvemote.id}/3x.webp`, resolution: [32, 32] }
    });
    //find the Twitch channel prefix
    let twemotesNameArray: string[] = [];
    twemotes.forEach((twemote: { name: string }) => {
      twemotesNameArray.push(twemote.name);
    });
    const twitchPrefix = getLongestCommonPrefix(twemotesNameArray)
    //add the twitch channel emote without the prefix
    twemotes.forEach(twemote => {
      emotes[twemote.name.substring(twitchPrefix.length)] = { url: twemote.image.url_4x, resolution: [32, 32] }
    });
    //add the 7tv emote
    stvemotes.forEach(stvemote => {
      if (stvemote.emote.flags.animated) {
        var scale = 0;
        stvemote.images.forEach(image => {
          if (image.mime == "image/avif" && !image.url.includes("static")) {
            if (image.scale > scale) {
              scale = image.scale
              emotes[stvemote.name] = { url: image.url, resolution: [32, 32] }
            }
          }
        });
      }
      else {
        var scale = 0;
        stvemote.images.forEach(image => {
          if (image.mime == "image/avif") {
            if (image.scale > scale) {
              scale = image.scale
              emotes[stvemote.name] = { url: image.url, resolution: [32, 32] }
            }
          }
        });
      }
    });
    //add twitch global emote
    twglobalemotes.data.forEach(globalEmote => {
      if (!['R)', ';P', ':P', ';)', ':/', '<3', ':O', 'B)', 'O_o', ':|', '>(', ':D', ':(', ':)'].includes(globalEmote.name))
        emotes[globalEmote.name] = { url: globalEmote.images.url_4x, resolution: [32, 32] }
    });
  }
})
//Fonction to detect the Channel emote prefix
function getLongestCommonPrefix(strings: string[]): string {
  if (!strings.length) return "";

  let prefix = strings[0];

  for (let i = 1; i < strings.length; i++) {
    const currentString = strings[i];
    let j = 0;

    while (
      j < prefix.length &&
      j < currentString.length &&
      prefix[j] === currentString[j]
    ) {
      j++;
    }

    prefix = prefix.substring(0, j);

    if (prefix === "") break;
  }

  return prefix;
}


function getEmotes() {

}*/