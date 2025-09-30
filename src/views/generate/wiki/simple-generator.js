const fs = require('fs')
const path = require('path')

// 读取Vue模板
const template = fs.readFileSync('./ArticleTemplate.vue', 'utf8')

// 提取template内容
function extractTemplate(content) {
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
  return templateMatch ? templateMatch[1] : content
}

// 数据替换函数
function renderTemplate(template, data) {
  let html = template

  // 替换所有 {{ expression }}
  html = html.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
    const value = getNestedValue(data, expression.trim())
    return value !== undefined ? value : ''
  })

  // 处理 v-for 循环
  html = html.replace(/<([^>]+)\s+v-for="([^"]+)"\s+([^>]*)>([\s\S]*?)<\/\1>/g,
    (match, tag, loop, attrs, content) => {
      const [item, array] = loop.split(' in ').map(s => s.trim())
      const arrayData = getNestedValue(data, array) || []

      return arrayData.map((itemData, index) => {
        let itemContent = content
        // 替换循环内的变量
        itemContent = itemContent.replace(new RegExp(`\\{\\{\\s*${item}\\.([^}]+)\\s*\\}\\}`, 'g'),
          (m, prop) => itemData[prop] || '')
        itemContent = itemContent.replace(new RegExp(`\\{\\{\\s*${item}\\s*\\}\\}`, 'g'),
          JSON.stringify(itemData))

        return `<${tag} ${attrs}>${itemContent}</${tag}>`
      }).join('')
    }
  )

  // 处理 v-if
  html = html.replace(/\s+v-if="[^"]*"/g, '')

  return html
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current && current[key], obj)
}

// 批量生成函数
function generateAll() {
  const articles = [
    { input: './data/korea.json', output: './dist/korea.html' },
    { input: './data/japan.json', output: './dist/japan.html' }
  ]

  const templateContent = extractTemplate(template)

  articles.forEach(({ input, output }) => {
    try {
      const data = require(input)
      const html = renderTemplate(templateContent, { articleData: data })

      // 确保目录存在
      const outputDir = path.dirname(output)
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true })
      }

      fs.writeFileSync(output, html)
      console.log(`✅ 生成: ${output}`)
    } catch (error) {
      console.error(`❌ 失败 ${output}:`, error.message)
    }
  })
}

generateAll()