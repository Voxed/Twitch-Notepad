

import { gql } from '@/gql/7tv'
import { ApolloClient, InMemoryCache, NormalizedCacheObject } from '@apollo/client';
import { Dispatch, SetStateAction } from 'react';

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

export interface EmoteImage {
  width: number, height: number,
  url: string
}

export interface Emote {
  name: string,
  images: EmoteImage[]
}

export class EmoteHelper {
  readonly #stvServer: ApolloClient<NormalizedCacheObject>;
  #overrideChannelId: string | undefined
  #regex: RegExp | undefined

  readonly #twitchAuth: Twitch.ext.Authorized
  readonly #overrideChannelName: string | undefined
  readonly #stripEmotePrefix: boolean

  #emotes: { [name: string] : Emote } = {}

  constructor(
    twitchAuth: Twitch.ext.Authorized,
    overrideChannelName: string | undefined = undefined,
    stripEmotePrefix: boolean = false,
    readonly setEmoteReady: Dispatch<SetStateAction<boolean>>
  ) {
    this.#twitchAuth = twitchAuth
    this.#overrideChannelName = overrideChannelName
    this.#stripEmotePrefix = stripEmotePrefix
    this.#stvServer = new ApolloClient({ uri: 'https://7tv.io/v4/gql', cache: new InMemoryCache() });
  }

  async init() {
    if (this.#overrideChannelName)
      this.#overrideChannelId = (await this.#twitchApiRequest('users', new URLSearchParams({ login: this.#overrideChannelName }))).data[0].id
    const emotes: Emote[] = (await Promise.all([
      this.#fetch7tvEmotes(),
      this.#fetchTwitchChannelEmotes(),
      this.#fetchTwitchGlobalEmotes(),
      this.#fetchBTTVGlobalEmotes()
    ])).flat()
    function escapeRegExp(text: string) {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }
    this.#regex = new RegExp(`((?<=^|[\n ])(${Array.from(emotes.map(e => escapeRegExp(e.name))).join('|')})(?=$|[\n ]))`)
    emotes.forEach(e => {
      this.#emotes[e.name] = e
    })
    this.setEmoteReady(true)
  }

  getRegExp(): RegExp {
    if(!this.#regex)
      throw "RegExp not generated, has EmoteHelper.init been called?"
    return this.#regex
  }

  getEmote(name: string): Emote {
    return this.#emotes[name]
  }

  async #twitchApiRequest(endpoint: string, params: URLSearchParams = new URLSearchParams({}), method: string = 'GET') {
    const response = await fetch('https://api.twitch.tv/helix/' + endpoint + "?" + params, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'client-id': this.#twitchAuth.clientId,
        'Authorization': 'Extension ' + this.#twitchAuth.helixToken
      }
    });
    return await response.json()
  }

  async #fetch7tvEmotes(): Promise<Emote[]> {
    const response = await this.#stvServer.query({ query: GET_USER_EMOTES, variables: { channelId: this.#overrideChannelId || this.#twitchAuth.channelId } })
    return (response.data.users.userByConnection?.style.activeEmoteSet?.emotes.items || []).map((emote) => ({
      name: emote.alias,
      images: emote.emote.images.reduce((acc, obj) =>
        (!emote.emote.flags.animated || obj.frameCount > 1) && obj.mime === 'image/avif' ? acc.concat([obj]) : acc
        , [] as EmoteImage[])
    }))
  }

  async #fetchTwitchChannelEmotes(): Promise<Emote[]> {
    const twitchEmoteSizes = {
      '1.0': { height: 28, width: 28 },
      '2.0': { height: 56, width: 56 },
      '3.0': { height: 112, width: 112 }
    }
    const emoteURL: (id: string, format: string, theme: string, scale: string) => string = (a1, a2, a3, a4) =>
      response.template.replace('{{id}}', a1)
        .replace('{{format}}', a2)
        .replace('{{theme_mode}}', a3)
        .replace('{{scale}}', a4)

    const response = (await this.#twitchApiRequest('chat/emotes', new URLSearchParams({ broadcaster_id: this.#overrideChannelId || this.#twitchAuth.channelId })))
    return response.data.map((e: {
      name: string,
      scale: ('1.0' | '2.0' | '3.0')[],
      format: string,
      theme_mode: string,
      id: string
    }) => ({
      name: e.name.substring(!this.#stripEmotePrefix ? 0 : e.name.search(/[A-Z]/g)),
      images: e.scale.map(s => ({
        width: twitchEmoteSizes[s].width,
        height: twitchEmoteSizes[s].height,
        url: emoteURL(e.id, e.format[0], e.theme_mode[0], s)
      }))
    }))
  }

  async #fetchTwitchGlobalEmotes(): Promise<Emote[]> {
    const twitchEmoteSizes = {
      '1.0': { height: 28, width: 28 },
      '2.0': { height: 56, width: 56 },
      '3.0': { height: 112, width: 112 }
    }
    const twitchSmileySizes = {
      '1.0': { height: 18, width: 24 },
      '2.0': { height: 36, width: 48 },
      '3.0': { height: 72, width: 96 }
    }
    const emoteURL: (id: string, format: string, theme: string, scale: string) => string = (a1, a2, a3, a4) =>
      response.template.replace('{{id}}', a1)
        .replace('{{format}}', a2)
        .replace('{{theme_mode}}', a3)
        .replace('{{scale}}', a4)

    const response = (await this.#twitchApiRequest('chat/emotes/global'))
    return response.data.map((e: {
      name: string,
      scale: ('1.0' | '2.0' | '3.0')[],
      format: string,
      theme_mode: string,
      id: string
    }) => ({
      name: e.name,
      images: e.scale.map(s => ({
        width: (['R)', ';P', ':P', ';)', ':/', '<3', ':O', 'B)', 'O_o', ':|', '>(', ':D', ':(', ':)'].includes(e.name) ? twitchSmileySizes : twitchEmoteSizes)[s].width,
        height: (['R)', ';P', ':P', ';)', ':/', '<3', ':O', 'B)', 'O_o', ':|', '>(', ':D', ':(', ':)'].includes(e.name) ? twitchSmileySizes : twitchEmoteSizes)[s].height,
        url: emoteURL(e.id, e.format[0], e.theme_mode[0], s)
      }))
    }))
  }

  async #fetchBTTVGlobalEmotes(): Promise<Emote[]> {
    const bttvEmoteSizes = {
      '1x': { height: 28, width: 28 },
      '2x': { height: 56, width: 56 },
      '3x': { height: 112, width: 112 }
    }
    const emoteURL: (id: string, scale: string) => string = (a1, a2) =>
      'https://cdn.betterttv.net/emote/{{id}}/{{scale}}.webp'.replace('{{id}}', a1).replace('{{scale}}', a2)

    const response = (await (await fetch("https://api.betterttv.net/3/cached/emotes/global")).json())
    return response.map((e: {
      code: string,
      id: string,
      width?: number,
      height?: number
    }) => ({
      name: e.code,
      images: (['1x', '2x', '3x'] as ('1x' | '2x' | '3x')[]).map((s) => ({
        width: e.width || bttvEmoteSizes[s].width,
        height: e.height || bttvEmoteSizes[s].height,
        url: emoteURL(e.id, s)
      }))
    }))
  }
}
/*
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
*/