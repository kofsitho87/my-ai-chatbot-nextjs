"use client"

import {
  AutosizeTextarea,
  type AutosizeTextAreaRef,
} from "@/components/auto-resize-textarea"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, PaperclipIcon } from "lucide-react"
import { StopIcon } from "@/components/icons"
import { sanitizeUIMessages } from "@/lib/utils"
import type { Attachment, ChatRequestOptions, CreateMessage, Message } from "ai"
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react"
import { useLocalStorage } from "usehooks-ts"
import { SuggestedActions } from "@/components/suggested-actions"
import { PreviewAttachment } from "@/components/preview-attachment"

type ChatInputProps = {
  chatId: string
  attachments: Array<Attachment>
  isLoading: boolean
  input: string
  messages: Array<Message>
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>
  setMessages: Dispatch<SetStateAction<Array<Message>>>
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>
  stop: () => void
  setInput: (value: string) => void
  handleSubmit: (
    event?: {
      preventDefault?: () => void
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void
}

export default function ChatInput({
  chatId,
  isLoading,
  input,
  messages,
  attachments,
  setAttachments,
  setInput,
  setMessages,
  append,
  handleSubmit,
}: ChatInputProps) {
  const textareaRef = useRef<AutosizeTextAreaRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [uploadQueue, setUploadQueue] = useState<Array<string>>([])
  const [localStorageInput, setLocalStorageInput] = useLocalStorage("input", "")

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.textArea.value
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || ""
      setInput(finalValue)
    }
  }, [])

  useEffect(() => {
    setLocalStorageInput(input)
  }, [input, setLocalStorageInput])

  const submitForm = useCallback(() => {
    window.history.replaceState({}, "", `/chat/${chatId}`)

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    })

    setAttachments([])
    setLocalStorageInput("")
  }, [attachments, handleSubmit, setAttachments, setLocalStorageInput, chatId])

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        const { url, pathname, contentType } = data

        return {
          url,
          name: pathname,
          contentType: contentType,
        }
      }
      const { error } = await response.json()
      toast.error(error)
    } catch (error) {
      toast.error("Failed to upload file, please try again!")
    }
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    setUploadQueue(files.map((file) => file.name))

    try {
      const uploadPromises = files.map((file) => uploadFile(file))
      const uploadedAttachments = await Promise.all(uploadPromises)
      const successfullyUploadedAttachments = uploadedAttachments.filter(
        (attachment) => attachment !== undefined,
      )

      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...successfullyUploadedAttachments,
      ])
    } catch (error) {
      console.error("Error uploading files!", error)
    } finally {
      setUploadQueue([])
    }
  }

  return (
    <div className='relative flex w-full flex-col gap-4'>
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions append={append} chatId={chatId} />
        )}
      <div className='overflow-hidden rounded border'>
        <input
          type='file'
          className='-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0'
          ref={fileInputRef}
          multiple
          onChange={handleFileChange}
          tabIndex={-1}
        />

        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div className='flex flex-row items-end gap-2 overflow-x-scroll'>
            {attachments.map((attachment) => (
              <PreviewAttachment key={attachment.url} attachment={attachment} />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                key={filename}
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
              />
            ))}
          </div>
        )}

        <AutosizeTextarea
          ref={textareaRef}
          maxHeight={500}
          autoFocus
          className='resize-none border-none outline-none ring-0 focus-visible:ring-0'
          placeholder='Type a message...'
          disabled={isLoading}
          value={input}
          onChange={(event) => {
            setInput(event.target.value)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()

              if (isLoading) {
                toast.error("Please wait for the model to finish its response!")
              } else {
                submitForm()
              }
            }
          }}
        />

        <div className='flex justify-end gap-2 px-4 pb-2'>
          <Button
            className='rounded-full dark:border-zinc-700'
            size='icon'
            onClick={(event) => {
              event.preventDefault()
              fileInputRef.current?.click()
            }}
            variant='outline'
            disabled={isLoading || uploadQueue.length > 0}
          >
            <PaperclipIcon size={14} />
          </Button>

          {isLoading ? (
            <Button
              className='rounded-full dark:border-zinc-600'
              variant='outline'
              size='icon'
              onClick={(event) => {
                event.preventDefault()
                stop()
                setMessages((messages) => sanitizeUIMessages(messages))
              }}
            >
              <StopIcon size={14} />
            </Button>
          ) : (
            <Button
              className='rounded-full'
              size='icon'
              onClick={(event) => {
                event.preventDefault()
                submitForm()
              }}
              disabled={input.length === 0 || uploadQueue.length > 0}
            >
              <ArrowUpIcon size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
