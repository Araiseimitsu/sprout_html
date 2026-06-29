<script lang="ts">
  // OS標準ダイアログでHTMLファイルを選んで開くためのモーダル。
  import { onMount } from 'svelte'
  import { fileApi } from '../../infrastructure/api/fileApi'
  import { ApiError } from '../../infrastructure/api/client'
  import { openFile } from '../../application/usecases/fileUsecases'

  let { onClose }: { onClose: () => void } = $props()

  async function openNativePicker() {
    try {
      const result = await fileApi.openFileDialog()
      if (!result.canceled && result.path) {
        await openFile(result.path)
      }
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'ファイル選択を開けませんでした'
      console.error(message)
    } finally {
      onClose()
    }
  }

  onMount(() => {
    openNativePicker()
  })
</script>
