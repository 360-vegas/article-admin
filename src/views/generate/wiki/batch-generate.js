const Vue = require('vue')
const renderer = require('vue-server-renderer').createRenderer()
const fs = require('fs')
const path = require('path')

// 导入您的Vue组件
const ArticleTemplate = require('./ArticleTemplate.vue').default

// 多个JSON数据文件
const articles = [
  {
    filename: 'korea.html',
    data: require('./data/korea.json') // 您的韩国JSON数据
  },
  {
    filename: 'japan.html',
    data: require('./data/japan.json') // 其他国家的数据
  },
  // 添加更多...
]

async function generateHTML(component, data, outputPath) {
  try {
    const app = new Vue({
      render: h => h(component, {
        props: {
          articleData: data
        }
      })
    })

    const html = await renderer.renderToString(app)

    // 确保输出目录存在
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // 写入HTML文件
    fs.writeFileSync(outputPath, html)
    console.log(`✅ 生成成功: ${outputPath}`)
  } catch (error) {
    console.error(`❌ 生成失败 ${outputPath}:`, error)
  }
}

async function batchGenerate() {
  console.log('开始批量生成HTML文件...')

  for (const article of articles) {
    const outputPath = path.join(__dirname, 'dist', article.filename)
    await generateHTML(ArticleTemplate, article.data, outputPath)
  }

  console.log('🎉 批量生成完成！')
}

batchGenerate()