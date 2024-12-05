import { openai } from "@ai-sdk/openai"
import { anthropic } from "@ai-sdk/anthropic"
import { experimental_wrapLanguageModel as wrapLanguageModel } from "ai"

import { customMiddleware } from "./custom-middleware"

export const customModel = (apiIdentifier: string) => {
  let model = null
  if (apiIdentifier.includes("claude")) {
    model = anthropic(apiIdentifier)
  }

  return wrapLanguageModel({
    model: model ?? openai(apiIdentifier),
    middleware: customMiddleware,
  })
}
