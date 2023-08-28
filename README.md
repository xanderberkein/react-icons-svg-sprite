# React Icons SVG Sprite

Get access to all the popular icon libraries from `react-icons`, but use SVG sprites for enhanced performance and user experience.

## Motivation
The `react-icons` library offers React developers easy access to a wide range of popular icon libraries. However, it recommends importing SVGs as JSX, which relies on inline SVG rendering and has some drawbacks:
- Inline SVGs increase the size of your HTML document, resulting in slower browser runtime and memory performance
- For client-side rendered React applications, using inline SVGs leads to larger bundle sizes. This means longer download and parsing times for the browser
- Including the same icon multiple times in your application results in duplicated SVGs within the bundle and the resulting HTML
Fortunately, there is a solution: SVG sprites. With SVG sprites, you can include all your icons in a single large SVG sprite and reference them from other SVGs using an id, similar to how image sprites work. This approach reduces the size of your HTML, decreases the bundle size, and enables reusability of duplicate icons.

## Installation
```shell
npm i react-icons-svg-sprite
```

## Usage
### CLI
The `react-icons-svg-sprite` package provides an easy-to-use CLI for managing your icons. You can add and remove icons, and the package will automatically generate your TypeScript types and SVG sprite.

#### Adding icons
To add icons, use the following command:

```shell
npx react-icons add [icons]
```
You can find all available icons on the [official `react-icons` library](https://react-icons.github.io/react-icons/). Click on any icon to copy its name. 

You can add multiple icons with a single command. For example:

```shell
npx react-icons add MdArrowLeft MdArrowRight 
```

#### Listing icons

To get an overview of all installed icons, use the following command:

```shell
npx react-icons list
```

#### Removing icons

To remove icons from your SVG sprite, use the following command:

```shell
npx react-icons remove [icons]
```

You can remove multiple icons with a single command.

### `Icon` component
To actually render your icons, you can use the built-in `Icon` component. This component accepts all props that an HTML SVG element takes and provides additional props for easier sizing and accessibility, similar to `react-icons`.

```tsx
<Icon 
  name="MdArrowLeft"
  size={24} 
  title="icon description for accessibility" 
/>
```

The React Context for global styling provided by `react-icons` is not supported.

### Configuration
By default, the generated SVG sprite is written to an `assets` folder at the root of your project. However, you can customize the output directory and other configurations (more planned in the future) by creating an `icons.config.js` file at the root of your project:
```js
/** @type {import('./src/config.types.ts').Config} */
module.exports = {
  out: "assets/icons",
};
```

All configuration options are also available as arguments in the CLI.
You can also pass a custom config path to the CLI with the `--config` flag.

| CLI flag | `icons.config.js` | Default |
|---|---|---|
| `--out`, `-o` | `out` | `assets` |
| `--config`, `-c` | | `icons.config.js` |
| `-- lib`, `-lib` | `lib` | |

- `--out, -o`: Specifies the relative path (e.g., `assets`) or relative file (e.g., `assets/sprite.svg`) for the output.
- `--config, -c`: Allows you to provide a custom config path. By default, if unset or unavailable, the CLI will fallback to the default config.
- `--lib, -lib`: Sets the default library to use when an icon is available in multiple icon libraries. Use the shorthand for the library (e.g., `fi` for Feather Icons, `io5` for Ionicons 5). Refer to the [official `react-icons` library](https://react-icons.github.io/react-icons) for all available shorthands.
