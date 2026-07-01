<script lang="ts">
  // クライアントPC側のブラウザ標準ファイル選択でHTMLファイルを開く。
  import { onMount } from 'svelte'
  import { openClientHtmlFile } from '../../application/usecases/fileUsecases'

  let { onClose }: { onClose: () => void } = $props()
  let fileInput = $state<HTMLInputElement | null>(null)

  type FilePickerWindow = Window &
    typeof globalThis & {
      showOpenFilePicker?: (options?: {
        multiple?: boolean
        types?: Array<{
          description: string
          accept: Record<string, string[]>
        }>
        excludeAcceptAllOption?: boolean
      }) => Promise<FileSystemFileHandle[]>
    }

  const htmlFileTypes = [
    {
      description: 'HTML files',
      accept: { 'text/html': ['.html', '.htm'] },
    },
  ]

  async function openBrowserPicker() {
    const pickerWindow = window as FilePickerWindow
    if (!pickerWindow.showOpenFilePicker) {
      fileInput?.click()
      return
    }

    try {
      const [handle] = await pickerWindow.showOpenFilePicker({
        multiple: false,
        types: htmlFileTypes,
        excludeAcceptAllOption: false,
      })
      if (handle) await openClientHtmlFile(await handle.getFile())
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        console.error(e)
      }
    } finally {
      onClose()
    }
  }

  async function onFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (file) await openClientHtmlFile(file)
    onClose()
  }

  onMount(() => {
    openBrowserPicker()
  })
</script>

<input
  bind:this={fileInput}
  class="file-input"
  type="file"
  accept=".html,.htm,text/html"
  onchange={onFileChange}
  oncancel={onClose}
/>

<style>
  .file-input {
    position: fixed;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
</style>
