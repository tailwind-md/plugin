import plugin from "tailwindcss/plugin";
import type { KeyValuePair, ResolvableTo } from "tailwindcss/types/config";
import { materialDesignTheme, type MaterialDesignConfig } from "./theme";
export type { MaterialDesignConfig } from "./theme";
import {
  elevationDistanceToBackgroundImage,
  flattenColors,
  flattenProperties,
  hexToRGBSpaceSeparated,
  isHexColor,
  shadowPenumbra,
  shadowUmbra,
  toCSSVariables,
  toTailwindBackgroundImageTheme,
  toTailwindBoxShadowTheme,
  toTailwindColorTheme,
  toTailwindFontSizeTheme,
  toTailwindTheme,
} from "./utils";

type RTKVP = ResolvableTo<KeyValuePair<string, string>>;

function _toRgbWithOpacity(value: string, opacity: string): string {
  return typeof value === "function"
    ? (value as (o: number) => string)(1).replace("/ 1", `/ ${opacity}`)
    : isHexColor(value)
    ? `rgb(${hexToRGBSpaceSeparated(value)} / ${opacity})`
    : value;
}

const materialDesignPlugin = plugin.withOptions<Partial<MaterialDesignConfig>>(
  (opts) => {
    return ({ addBase, matchUtilities, theme, addUtilities }) => {
      // add base
      const { theme: md, mergedConfig: conf } = materialDesignTheme(opts);

      const color = { ...md.sys.color };
      delete md.sys.color;

      const els = { ...md.sys.elevation };

      delete md.sys.elevation;

      const elevations: Record<
        string,
        {
          shadowUmbra: string;
          shadowPenumbra: string;
          surface: string;
        }
      > = {};

      for (const [key, value] of Object.entries(els)) {
        const umbra = shadowUmbra(value);
        const penumbra = shadowPenumbra(value);

        elevations[key] = {
          surface: elevationDistanceToBackgroundImage(value),
          shadowUmbra: `${umbra.xOffset} ${umbra.yOffset} ${umbra.blurRadius} ${umbra.spreadRadius}`,
          shadowPenumbra: `${penumbra.xOffset} ${penumbra.yOffset} ${penumbra.blurRadius} ${penumbra.spreadRadius}`,
        };
      }

      matchUtilities(
        {
          ripple: (value) => {
            return {
              "--md-ripple-color": _toRgbWithOpacity(
                value,
                "var(--md-ripple-opacity, 1)",
              ),
            };
          },
          "state-layer": (value) => {
            return {
              "--md-state-layer-color": _toRgbWithOpacity(
                value,
                "var(--md-state-layer-opacity, 1)",
              ),
            };
          },
          "surface-overlay": (value) => {
            return {
              "--md-surface-overlay-color": _toRgbWithOpacity(
                value,
                "var(--md-surface-overlay-opacity, 1)",
              ),
            };
          },
          container: (value) => {
            return {
              "--md-container-color": _toRgbWithOpacity(
                value,
                "var(--md-container-opacity, 1)",
              ),
            };
          },
        },
        {
          values: flattenColors(theme("colors")),
          type: ["color"],
        },
      );

      matchUtilities(
        {
          "ripple-opacity": (value) => {
            return {
              "--md-ripple-opacity": value,
            };
          },
          "state-layer-opacity": (value) => {
            return {
              "--md-state-layer-opacity": value,
            };
          },
          "surface-overlay-opacity": (value) => {
            return {
              "--md-surface-overlay-opacity": value,
            };
          },
          "container-opacity": (value) => {
            return {
              "--md-container-opacity": value,
            };
          },
        },
        {
          values: theme("opacity"),
          type: ["percentage", "any"],
        },
      );

      addUtilities({
        ".material": {
          backgroundImage: `
            linear-gradient(0deg, var(--md-ripple-color, transparent) 0%, var(--md-ripple-color, transparent) 100%),
            linear-gradient(0deg, var(--md-state-layer-color, transparent) 0%, var(--md-state-layer-color, transparent) 100%),
            linear-gradient(0deg, var(--md-surface-overlay-color, transparent) 0%, var(--md-surface-overlay-color, transparent) 100%),
            linear-gradient(0deg, var(--md-container-color, transparent) 0%, var(--md-container-color, transparent) 100%)
            `,
        },
      });

      addBase({
        "*": toCSSVariables(
          flattenProperties({
            md,
          }),
        ),
      });

      addBase({
        "*": toCSSVariables(
          flattenProperties({
            md: {
              sys: {
                elevation: elevations,
              },
            },
          }),
        ),
      });

      addBase({
        ":root": toCSSVariables(
          flattenProperties({
            md: {
              sys: {
                color: color[conf.theme.color.defaultThemeMode],
              },
            },
          }),
        ),
      });

      const themeModes = conf.theme.color.generateThemeModes;

      for (const themeMode of themeModes) {
        if (conf.theme.color.themeModeSwitchMethod === "class") {
          addBase({
            [`.${themeMode}`]: toCSSVariables(
              flattenProperties({
                md: {
                  sys: {
                    color: color[themeMode],
                  },
                },
              }),
            ),
          });
        } else {
          addBase({
            [`[data-theme-mode="${themeMode}"]`]: toCSSVariables(
              flattenProperties({
                md: {
                  sys: {
                    color: color[themeMode],
                  },
                },
              }),
            ),
          });
        }
      }
    };
  },
  (opts) => {
    const { theme: md } = materialDesignTheme(opts);

    let colors = toTailwindColorTheme(md.sys.color.light, {
      prefix: "md-sys-color",
    });

    const backgroundImage = toTailwindBackgroundImageTheme(md.sys.elevation, {
      prefix: "md-sys-elevation",
      createKey: (k) => `surface-elevation-${k}`,
    });

    const opacity = toTailwindTheme(flattenProperties(md.sys.state), {
      prefix: "md-sys-state",
      createKey: (k) => k.replace("Opacity", ""),
    }) as unknown as RTKVP;

    const borderRadius = toTailwindTheme(md.sys.shape.corner, {
      prefix: "md-sys-shape-corner",
    });

    const fontSize = toTailwindFontSizeTheme(md.sys.typescale, {
      prefix: "md-sys-typescale",
    });

    const boxShadow = toTailwindBoxShadowTheme(md.sys.elevation, {
      prefix: "md-sys-elevation",
      createKey: (k) => `elevation-${k}`,
    });

    if (opts?.emitReferenceClasses) {
      colors = {
        ...colors,

        ...toTailwindColorTheme(md.ref.palette, {
          prefix: "md-ref-palette",
        }),
      };
    }

    return {
      theme: {
        extend: {
          colors,
          borderRadius,
          boxShadow,
          backgroundImage,
          opacity,
          fontSize,
        },
      },
    };
  },
);

export default materialDesignPlugin;
