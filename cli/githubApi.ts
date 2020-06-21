import { serve } from 'https://deno.land/std/http/server.ts'
import { opn } from 'https://denopkg.com/hashrock/deno-opn/opn.ts'

import { GITHUB_INFO } from './config.ts'

type Config = {
  clientId?: string
  clientSecret?: string
  accessToken?: string
}

let config: Config

try {
  const file = await Deno.readFile('./githubConfig.json')
  const decoder = new TextDecoder()
  const text = decoder.decode(file)
  const json = JSON.parse(text)
  config = json
}
catch {
  config = {}
}

const writeConfig = async () => {
  const text = JSON.stringify(config)
  const encoder = new TextEncoder()
  const file = encoder.encode(text)
  await Deno.writeFile('./githubConfig.json', file)
}

if (!config.clientId) {
  config.clientId = Deno.env.get('GITHUB_CLIENT_ID')
}

if (!config.clientSecret) {
  config.clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')
}

await writeConfig()

const auth = async () => {
  if (config.accessToken) {
    return
  }
  const state = Math.random().toString(36).substring(7)
  await opn(`https://github.com/login/oauth/authorize?client_id=${ config.clientId }&state=${ state }`)
  const server = serve({ port: 4987 })
  for await (const req of server) {
    const url = new URL(`http://localhost:4987${ req.url }`)
    if (url.pathname !== '/github-auth') {
      console.log(url)
      req.respond({ body: 'Not found', status: 404 })
      continue
    }
    if (url.searchParams.get('state') !== state) {
      req.respond({ body: 'Invalid state', status: 400 })
      continue
    }
    const code = url.searchParams.get('code')
    const request = await fetch(`https://github.com/login/oauth/access_token?client_id=${ config.clientId }&client_secret=${ config.clientSecret }&code=${ code }&state=${ state }`, {
      method: 'POST',
      headers: { accept: 'application/json' }
    })
    const { access_token } = await request.json()
    config.accessToken = access_token
    await writeConfig()
    await req.respond({ body: 'Done' })
    server.close()
  }
}

const cache: any = {}

export const makeGithubApiRequest = async (path: string) => {
  if (cache[ path ]) {
    return cache[ path ]
  }
  await auth()

  const request = await fetch(`${ GITHUB_INFO?.API_ROOT }${ path }`, {
    headers: {
      authorization: `token ${ config.accessToken }`
    }
  })
  const response = await request.json()
  cache[ path ] = response
  return response
}
