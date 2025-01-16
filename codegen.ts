import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
    generates: {
        './src/gql/7tv/': {
            schema: "https://7tv.io/v4/gql",
            preset: 'client',
            presetConfig: { 
                gqlTagName: "gql"
            },
            documents: ['src/**/*.tsx'],
        }
    },
    overwrite: true,
}

export default config