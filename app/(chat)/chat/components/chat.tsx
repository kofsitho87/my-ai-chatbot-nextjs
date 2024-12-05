"use client"

import type { Attachment, Message } from "ai"
import { useChat } from "ai/react"
import { AnimatePresence } from "framer-motion"
import { useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { useWindowSize } from "usehooks-ts"

import { ChatHeader } from "@/components/chat-header"
import type { Vote } from "@/lib/db/schema"
import { fetcher, sanitizeUIMessages } from "@/lib/utils"

import { Block, type UIBlock } from "@/components/block"
import { BlockStreamHandler } from "@/components/block-stream-handler"
import { Messages } from "@/components/messages"
import ChatInput from "./chat-input"

export function Chat({
  id,
  initialMessages,
  selectedModelId,
}: {
  id: string
  initialMessages: Array<Message>
  selectedModelId: string
}) {
  const { mutate } = useSWRConfig()

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    data: streamingData,
  } = useChat({
    body: { id, modelId: selectedModelId },
    initialMessages,
    onFinish: () => {
      mutate("/api/history")
    },
  })

  const { width: windowWidth = 1920, height: windowHeight = 1080 } =
    useWindowSize()

  const [block, setBlock] = useState<UIBlock>({
    documentId: "init",
    content: "",
    title: "",
    status: "idle",
    isVisible: false,
    boundingBox: {
      top: windowHeight / 4,
      left: windowWidth / 4,
      width: 250,
      height: 50,
    },
  })

  const { data: votes } = useSWR<Array<Vote>>(`/api/vote?chatId=${id}`, fetcher)

  const [attachments, setAttachments] = useState<Array<Attachment>>([])

  return (
    <>
      <div className='flex h-dvh min-w-0 flex-col bg-background'>
        <ChatHeader selectedModelId={selectedModelId} />

        <Messages
          chatId={id}
          block={block}
          setBlock={setBlock}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
        />

        <form className='mx-auto flex w-full gap-2 bg-background px-4 pb-4 md:max-w-3xl md:pb-6'>
          <ChatInput
            chatId={id}
            handleSubmit={handleSubmit}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
            isLoading={isLoading}
            input={input}
            setInput={setInput}
          />
        </form>
      </div>

      <AnimatePresence>
        {block?.isVisible && (
          <Block
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            append={append}
            block={block}
            setBlock={setBlock}
            messages={messages}
            setMessages={setMessages}
            votes={votes}
          />
        )}
      </AnimatePresence>

      <BlockStreamHandler streamingData={streamingData} setBlock={setBlock} />
    </>
  )
}
