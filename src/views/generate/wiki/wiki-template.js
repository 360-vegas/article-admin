export default {
  name: 'WikiPageTemplateWithInput',
  data() {
    return {
      jsonInput: '',
      renderedData: null,
      errorMessage: '',
      successMessage: ''
    }
  },
  computed: {
    breadcrumbItems() {
      if (!this.renderedData) return []
      return ['首页', this.renderedData.meta.breadcrumb_category, this.renderedData.title]
    }
  },
  methods: {
    renderJson() {
      this.errorMessage = ''
      this.successMessage = ''
      
      if (!this.jsonInput.trim()) {
        this.errorMessage = '请输入JSON数据'
        return
      }
      
      try {
        const parsedData = JSON.parse(this.jsonInput)
        // 简单验证数据结构
        if (!parsedData.title || !parsedData.meta || !parsedData.infobox || !parsedData.content) {
          this.errorMessage = 'JSON数据结构不完整，请确保包含title、meta、infobox和content字段'
          return
        }
        
        this.renderedData = parsedData
        this.successMessage = 'JSON数据解析成功，页面已渲染'
      } catch (e) {
        this.errorMessage = `JSON解析错误: ${e.message}`
        this.renderedData = null
      }
    },
    clearInput() {
      this.jsonInput = ''
      this.errorMessage = ''
      this.successMessage = ''
      this.renderedData = null
    }
  }
}