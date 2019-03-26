#! /usr/bin/env node
const path = require('path')
const fs = require('fs-extra')
require('./XTemplate/js')

function boldGreen (s) {
  var boldgreencolor = `\x1b[32m\x1b[1m`
  var endMarker = `\x1b[0m`
  return (`${boldgreencolor}${s}${endMarker}`)
}
function boldRed (s) {
  var boldredcolor = `\x1b[31m\x1b[1m`
  var endMarker = `\x1b[0m`
  return (`${boldredcolor}${s}${endMarker}`)
}

upgrade()

function findIt(framework, packageJson, o) {
  var v = ''
  var key = ''
  if (framework == 'extjs') {
    key = '@sencha/ext-webpack-plugin'
  }
  else {
    key = '@sencha/ext-' + framework + '-webpack-plugin'
  }
  var inDep = packageJson.old.dependencies.hasOwnProperty(key) 
  if (inDep) {
    v = packageJson.old.dependencies[key].slice(-5)
  }
  var inDevDep = packageJson.old.devDependencies.hasOwnProperty(key) 
  if (inDevDep) {
    v = packageJson.old.devDependencies[key].slice(-5)
  }
  if (v != '') { o.foundFramework = framework; o.foundVersion = v; o.foundKey = key; }
}

function findItOlder(framework, packageJson, o) {
  var v = ''
  var key = ''
  key = '@extjs/reactor-webpack-plugin'

  var inDep = packageJson.old.dependencies.hasOwnProperty(key) 
  if (inDep) {
    v = packageJson.old.dependencies[key].slice(-5)
  }
  var inDevDep = packageJson.old.devDependencies.hasOwnProperty(key) 
  if (inDevDep) {
    v = packageJson.old.devDependencies[key].slice(-5)
  }
  if (v != '') { o.foundFramework = framework; o.foundVersion = v; o.foundKey = key; }
}

var rootDir
var backupDir
var upgradeDir

function setAndArchive(o, name) {
  o.name = name
  o.root = path.join(rootDir, o.name)
  o.backup = path.join(backupDir, o.name)

  if (!fs.existsSync(o.root)){
    console.log(`${boldRed('Error: ' + o.root.replace(process.cwd(), '') + ' does not exist')}`)
    return
  }
  else {
    fs.copySync(o.root, o.backup)
    console.log(`${boldGreen('Archived ' + o.root.replace(process.cwd(), '') + ' to ' +  o.backup.replace(process.cwd(), ''))}`)
  }
}


function upgrade() {
  rootDir = path.resolve(process.cwd())
  backupDir = path.resolve(rootDir, 'extBackup')
  upgradeDir = path.resolve(__dirname, 'upgradeTemplates')

  if (fs.existsSync(backupDir)){
    console.log(`${boldRed('Error: backup folder ' + backupDir.replace(process.cwd(), '') + ' exists')}`)
    return
  }
  if (!fs.existsSync(upgradeDir)){
    console.log(`${boldRed('Error: ' + upgradeDir.replace(process.cwd(), '') + ' does not exist')}`)
    return
  }

  var packageJson = {}
  var webpackConfigJs = {}
  var babelrc = {}
  var indexjs = {}

  setAndArchive(packageJson, 'package.json')
  setAndArchive(webpackConfigJs, 'webpack.config.js')
  setAndArchive(babelrc, '.babelrc')
  setAndArchive(indexjs, 'index.js')

  packageJson.old = JSON.parse(fs.readFileSync(packageJson.root, {encoding: 'utf8'}))
  var o = {
    foundFramework: '',
    foundVersion: '',
    foundKey: ''
  }
  findIt('extjs', packageJson, o)
  findIt('react', packageJson, o)
  findIt('angular', packageJson, o)
  findIt('components', packageJson, o)
  findItOlder('react', packageJson, o)

  console.log('Upgrading ' + o.foundKey + ' ' + o.foundVersion + ' to ext-' + o.foundFramework + ' 6.7.1')
 
  var frameworkTemplateFolder = path.join(upgradeDir, o.foundFramework)
  packageJson.new = JSON.parse(fs.readFileSync(path.join(frameworkTemplateFolder, 'package.json'), {encoding: 'utf8'}))

  packageJson.upgrade = path.join(frameworkTemplateFolder, packageJson.name)
  webpackConfigJs.upgrade = path.join(frameworkTemplateFolder, webpackConfigJs.name)
  babelrc.upgrade = path.join(frameworkTemplateFolder, babelrc.name)
  indexjs.upgrade = path.join(frameworkTemplateFolder, indexjs.name)

  fs.mkdirSync(backupDir)
  console.log(`${boldGreen('Created ' + backupDir.replace(process.cwd(), ''))}`)

  packageJson.old.scripts = packageJson.new.scripts
  packageJson.old.devDependencies = packageJson.new.devDependencies
  packageJson.old.dependencies = packageJson.new.dependencies
  delete packageJson.old.extDefults
  //delete packageJson.old['extDefults'];
  fs.writeFileSync(packageJson.root, JSON.stringify(packageJson.old, null, 2));
  console.log(`${boldGreen('Updated ' + packageJson.root.replace(process.cwd(), ''))}`)

  var values = {}
  switch (o.foundFramework) {
    case 'extjs':
      values = {
        framework: 'extjs',
        contextFolder: './',
        entryFile: './app.js',
        outputFolder: './',
        rules: `[
          { test: /.(js|jsx)$/, exclude: /node_modules/ }
        ]`,
        resolve:`{
        }`
      }
      break;
    case 'react':
      values = {
        framework: 'react',
        contextFolder: './src',
        entryFile: './index.js',
        outputFolder: 'build',
        rules: `[
          { test: /\.ext-reactrc$/, use: 'raw-loader' },
          { test: /\.(js|jsx)$/, exclude: /node_modules/, use: ['babel-loader'] },
          { test: /\.(html)$/,use: { loader: 'html-loader' } },
          {
            test: /\.(css|scss)$/,
            use: [
              { loader: 'style-loader' },
              { loader: 'css-loader' },
              { loader: 'sass-loader' }
            ]
          }
        ]`,
        resolve:`{
          alias: {
            'react-dom': '@hot-loader/react-dom'
          }
        }`
      }
      break;
    case 'angular':
      values = {
        framework: 'angular',
        contextFolder: './src',
        entryFile: './main.ts',
        outputFolder: 'build',
        rules: `[
          { test: /\.ext-reactrc$/, use: 'raw-loader' },
          { test: /\.(js|jsx)$/, exclude: /node_modules/, use: ['babel-loader'] },
          { test: /\.(html)$/,use: { loader: 'html-loader' } },
          {
            test: /\.(css|scss)$/,
            use: [
              { loader: 'style-loader' },
              { loader: 'css-loader' },
              { loader: 'sass-loader' }
            ]
          }
        ]`,
        resolve:`{
          extensions: ['.ts', '.js', '.html']
        }`
      }
      break;
    case 'components':
      break;
  }

  var content = fs.readFileSync(webpackConfigJs.upgrade).toString()
  var tpl = new Ext.XTemplate(content)
  var t = tpl.apply(values)
  tpl = null
  fs.writeFileSync(webpackConfigJs.root, t);
  console.log(`${boldGreen('Updated ' + webpackConfigJs.root.replace(process.cwd(), ''))}`)

  fs.copySync(babelrc.upgrade, babelrc.root)
  console.log(`${boldGreen('Copied ' + babelrc.upgrade.replace(__dirname, '') + ' to ' +  babelrc.root.replace(process.cwd(), ''))}`)


  const replace = require('replace-in-file');
  const options = {}
  options = {
    files: path.join(rootDir, 'src/**/*.js'),
    from: /\@extjs\/ext-react/g,
    to: '@sencha/ext-react',
  };
  try {
    const changes = replace.sync(options);
    console.dir(changes)
    console.log('Modified files:', changes.join(', '));
  }
  catch (error) {
    console.error('Error occurred:', error);
  }

  options = {
    files: path.join(rootDir, 'src/**/*.js'),
    from: /\@extjs\/reactor/g,
    to: '@sencha/ext-react',
  };
  try {
    const changes = replace.sync(options);
    console.log('Modified files:', changes.join(', '));
  }
  catch (error) {
    console.error('Error occurred:', error);
  }

  options = {
    files: path.join(rootDir, 'src/**/*.js'),
    from: /\<Transition.*\\\>/g,
    to: '',
  };
  try {
    const changes = replace.sync(options);
    console.log('Modified files:', changes.join(', '));
  }
  catch (error) {
    console.error('Error occurred:', error);
  }

  options = {
    files: path.join(rootDir, 'src/**/*.js'),
    from: /\<\/Transition\>/g,
    to: '',
  };
  try {
    const changes = replace.sync(options);
    console.log('Modified files:', changes.join(', '));
  }
  catch (error) {
    console.error('Error occurred:', error);
  }



  console.log('upgrade completed')
  return
}