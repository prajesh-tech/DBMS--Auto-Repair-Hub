const config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "error-container": "#ffdad6",
                        "on-tertiary-fixed-variant": "#00530a",
                        "tertiary-container": "#ffffff",
                        "on-primary-container": "#747676",
                        "on-primary-fixed-variant": "#454747",
                        "on-error": "#ffffff",
                        "tertiary-fixed": "#74ff6c",
                        "tertiary-fixed-dim": "#00e630",
                        background: "#fcf8f8",
                        "surface-container-highest": "#e5e2e1",
                        "on-surface-variant": "#444748",
                        primary: "#5d5f5f",
                        "primary-fixed": "#e2e2e2",
                        "secondary-container": "#2b69fa",
                        "surface-container-lowest": "#ffffff",
                        "on-error-container": "#93000a",
                        "surface-bright": "#fcf8f8",
                        "surface-tint": "#5d5f5f",
                        "on-primary": "#ffffff",
                        "inverse-on-surface": "#f4f0ef",
                        "primary-fixed-dim": "#c6c6c7",
                        error: "#ba1a1a",
                        "on-tertiary": "#ffffff",
                        "on-tertiary-container": "#008918",
                        tertiary: "#006e11",
                        "outline-variant": "#c1c6d5",
                        "on-secondary-container": "#fefcff",
                        "primary-container": "#ffffff",
                        "on-secondary-fixed-variant": "#003da9",
                        surface: "#fcf8f8",
                        "surface-container-high": "#ebe7e7",
                        "on-primary-fixed": "#1a1c1c",
                        "inverse-primary": "#c6c6c7",
                        "on-surface": "#1c1b1b",
                        secondary: "#0050d7",
                        "on-tertiary-fixed": "#002202",
                        "inverse-surface": "#313030",
                        "surface-variant": "#e5e2e1",
                        "on-secondary-fixed": "#00174c",
                        "secondary-fixed-dim": "#b4c5ff",
                        "on-secondary": "#ffffff",
                        "secondary-fixed": "#dbe1ff",
                        "on-background": "#1c1b1b",
                        "surface-dim": "#ddd9d9",
                        "surface-container": "#ecedf7",
                        "surface-container-low": "#f2f3fd",
                        "surface-container-lowest": "#ffffff",
                        outline: "#747878"
                    },
                    borderRadius: {
                        DEFAULT: "0.25rem",
                        lg: "0.5rem",
                        xl: "0.75rem",
                        full: "9999px"
                    },
                    spacing: {
                        "space-lg": "1.5rem",
                        "space-xl": "2rem",
                        margin: "1.5rem",
                        "space-sm": "0.5rem",
                        gutter: "1rem",
                        "space-xs": "0.25rem",
                        "space-md": "1rem"
                    },
                    fontFamily: {
                        "headline-lg": ["Inter", "sans-serif"]
                    },
                    fontSize: {
                        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }]
                    }
                }
            }
        };
config.content = ['./public/**/*.html', './public/js/**/*.js'];
config.theme.extend.spacing['gutter-mobile'] = '1rem';
config.theme.extend.colors = Object.fromEntries(Object.keys(config.theme.extend.colors).map(key => [key, `rgb(var(--rgb-${key}) / <alpha-value>)`]));
Object.assign(config.theme.extend, {"fontFamily":{"headline-xl":["Inter","sans-serif"],"headline-md":["Inter","sans-serif"],"label-md":["Inter","sans-serif"],"body-lg":["Inter","sans-serif"],"body-md":["Inter","sans-serif"],"label-sm":["Inter","sans-serif"],"display-lg":["Inter","sans-serif"],"data-metric":["Inter","sans-serif"],"headline-xl-mobile":["Inter","sans-serif"],"display-lg-mobile":["Inter","sans-serif"],"body-sm":["Inter","sans-serif"],"headline-sm":["Inter","sans-serif"],"headline":["Inter","sans-serif"],"display":["Inter","sans-serif"],"body":["Inter","sans-serif"],"label":["Inter","sans-serif"]},"fontSize":{"headline-xl":["32px",{"lineHeight":"40px","letterSpacing":"-0.015em","fontWeight":"600"}],"headline-md":["20px",{"lineHeight":"28px","letterSpacing":"-0.01em","fontWeight":"600"}],"label-md":["13px",{"lineHeight":"16px","letterSpacing":"0.01em","fontWeight":"500"}],"body-lg":["16px",{"lineHeight":"24px","fontWeight":"400"}],"body-md":["14px",{"lineHeight":"20px","fontWeight":"400"}],"label-sm":["11px",{"lineHeight":"14px","letterSpacing":"0.04em","fontWeight":"600"}],"display-lg":["40px",{"lineHeight":"48px","letterSpacing":"-0.02em","fontWeight":"700"}],"data-metric":["28px",{"lineHeight":"32px","letterSpacing":"-0.02em","fontWeight":"700"}],"headline-xl-mobile":["24px",{"lineHeight":"32px","letterSpacing":"-0.01em","fontWeight":"600"}],"display-lg-mobile":["30px",{"lineHeight":"38px","letterSpacing":"-0.02em","fontWeight":"700"}],"body-sm":["12px",{"lineHeight":"16px","fontWeight":"400"}],"headline-sm":["16px",{"lineHeight":"24px","fontWeight":"600"}]}});
config.theme.extend.fontFamily['headline-lg'] = ['Inter', 'sans-serif'];
config.theme.extend.fontSize['headline-lg'] = ['32px', { lineHeight: '40px', fontWeight: '600' }];
module.exports = config;
