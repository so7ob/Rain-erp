import { defineStore } from 'pinia'
import { watch } from 'vue'
import { store } from '../index'
import type { DictDataVO } from '@/api/system/dict/dict.data'
import { CACHE_KEY, useCache } from '@/hooks/web/useCache'
import { getDisplayCacheScope, clearDictionaryCaches } from '@/hooks/web/cacheContext'
import { createContextLoader } from '@/utils/cacheContextPolicy'
import { getSimpleDictDataList } from '@/api/system/dict/dict.data'

const { wsCache } = useCache('sessionStorage')
const load = createContextLoader(getDisplayCacheScope, getSimpleDictDataList)
let started = false

export interface DictValueType {
  dictType: string
  value: any
  label: string
  displayLabel?: string
  colorType?: string
  cssClass?: string
}
export interface DictTypeType {
  dictType: string
  dictValue: DictValueType[]
}
export interface DictState {
  dictMap: Record<string, DictValueType[]>
  isSetDict: boolean
  context: string
}

export const useDictStore = defineStore('dict', {
  state: (): DictState => ({ dictMap: {}, isSetDict: false, context: '' }),
  getters: {
    getDictMap(): Record<string, DictValueType[]> {
      return this.context === getDisplayCacheScope() ? this.dictMap : {}
    },
    getIsSetDict(): boolean {
      return this.isSetDict && this.context === getDisplayCacheScope()
    }
  },
  actions: {
    async setDictMap() {
      started = true
      const context = getDisplayCacheScope()
      const cached = wsCache.get(CACHE_KEY.DICT_CACHE)
      if (cached) {
        this.dictMap = cached
        this.context = context
        this.isSetDict = true
        return
      }
      await load((records: DictDataVO[], captured) => {
        const dictMap: Record<string, DictValueType[]> = Object.create(null)
        for (const entry of records || []) {
          // Preserve canonical source fields; display labels are derived by the presentation adapter.
          ;(dictMap[entry.dictType] ??= []).push({ ...entry })
        }
        this.dictMap = dictMap
        this.context = captured
        this.isSetDict = true
        wsCache.set(CACHE_KEY.DICT_CACHE, dictMap, { exp: 60 })
      })
    },
    getDictByType(type: string) {
      if (!this.getIsSetDict) void this.setDictMap().catch(() => {})
      return this.getDictMap[type]
    },
    async resetDict() {
      clearDictionaryCaches()
      load.invalidate()
      this.isSetDict = false
      await this.setDictMap()
    }
  }
})

export const useDictStoreWithOut = () => useDictStore(store)

watch(getDisplayCacheScope, () => {
  if (started)
    void useDictStoreWithOut()
      .setDictMap()
      .catch(() => {})
})
