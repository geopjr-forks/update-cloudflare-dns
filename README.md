<h1 align="center">☁️ with-a-chance-of-meatballs 🍝</h1>
<h4 align="center">A GitHub Action that updates CloudFlare DNS records</h4>
<p align="center">
  <br />
    <a href="https://github.com/GeopJr/with-a-chance-of-meatballs/blob/main/CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/Contributor%20Covenant-v2.1-f7e194.svg?style=for-the-badge&labelColor=bd250e" alt="Code Of Conduct" /></a>
    <a href="https://github.com/GeopJr/with-a-chance-of-meatballs/blob/main/LICENSE"><img src="https://img.shields.io/badge/LICENSE-MIT-f7e194.svg?style=for-the-badge&labelColor=bd250e" alt="MIT licensed" /></a>
    <a href="https://github.com/GeopJr/with-a-chance-of-meatballs/actions"><img src="https://img.shields.io/github/workflow/status/geopjr/with-a-chance-of-meatballs/Test/main?labelColor=bd250e&style=for-the-badge" alt="ci action status" /></a>
</p>

#

## What is with-a-chance-of-meatballs?

It's a GitHub action that takes a json of DNS records as input and updates CloudFlare after deciding which records it should keep, delete and add.

This is a fork of [pvinis/update-cloudflare-dns](https://github.com/pvinis/update-cloudflare-dns) with some important changes.

#

## Differences to upstream

- Use JSON instead of HJSON - almost all langs have json parsers either built-in or as deps, hjson just makes scripting troublesome
- Limit toolset - ncc for bundling, mocha+chai for testing, jsdoc for types (it's a small codebase)
- Enable CNAME and MX support
- Use "content" for all targets instead of ipv4,ipv6,content,target based on the record type - CloudFlare accepts it as "content" for all types, having to keep track of the record type just to get its content is troublesome
- Bump runner to node16
- Simplify, clean and remove parts of it

#

## Using

- Create a new repo secret named `CLOUDFLARE_TOKEN` with your CF token.

- You are going to need a [DNS-RECORDS.json](./DNS-RECORDS.json) with the following content:

```json
{
  "records": [
    {
      "type": "<A/AAAA/TXT/MX/CNAME>",
      "name": "the record name",
      "content": "the record target/content",
      "ttl": 1, // 1 = AUTO
      "priority": 10, // Optional, only for MX
      "proxied": true // Default = true, whether to be proxied through CF
    }
  ]
}
```

- Use the action:

```yml
uses: GeopJr/with-a-chance-of-meatballs@<version/commit> # Since the action uses your CF token, it's better to lock to a commit in case it gets compromised
with:
  zone: mydomain.com # See next section on how to script this
```

You can see this repo's [DNS-RECORDS.json](./DNS-RECORDS.json) for an example.

#

## Scripting

I use this actions to allow my [sponsors](https://github.com/sponsors/GeopJr) to claim subdomains of my domains (similar to [is-a.dev](https://is-a.dev/) or [js.org](https://js.org/)).

I automate this with the help of [sponsors.cr](https://github.com/GeopJr/sponsors.cr) - a CLI tool that parses DNS records in a more readable format and exports them in others (json, hjson, markdown, plain) - and this action.

There are instruction in the [template repo](https://github.com/geopjr-sponsors/with-a-chance-of-meatballs-template) on how to achieve this.

The workflow is simple: use sponsors.cr to generate JSONs -> create a matrix of all available domains -> run `with-a-chance-of-meatballs` for each one.

#

## Creating the CF token

- Go to [My Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
- Click the button with the label "Create Token"
- Click the button with the label "Use template" next to "Edit zone DNS"
- Under "Zone Resources" select the zones/domains you want the token to have access to
- Don't change any of the settings unless you want to and click the button with the label "Continue to summary"
- Click the button with the label "Create Token" and copy it

#

## Contributing

1. Read the [Code of Conduct](https://github.com/GeopJr/with-a-chance-of-meatballs/blob/main/CODE_OF_CONDUCT.md)
2. Fork it ( https://github.com/GeopJr/with-a-chance-of-meatballs/fork )
3. Create your feature branch (git checkout -b my-new-feature)
4. Commit your changes (git commit -am 'Add some feature')
5. Push to the branch (git push origin my-new-feature)
6. Create a new Pull Request

#

## Sponsors

<p align="center">

[![GeopJr Sponsors](https://cdn.jsdelivr.net/gh/GeopJr/GeopJr@main/sponsors.svg)](https://github.com/sponsors/GeopJr)

</p>

[Read the original README.](https://github.com/pvinis/update-cloudflare-dns#readme=)
