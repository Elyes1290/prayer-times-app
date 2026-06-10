const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "Xcode 26 workaround: patch fmt";

const FMT_PATCH = `
    # ${MARKER} to disable consteval (fmt 11.0.2 + Apple Clang 21)
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      unless content.include?('${MARKER}')
        patched = content.gsub(
          /^(#elif defined\\(__cpp_consteval\\)\\n#  define FMT_USE_CONSTEVAL) 1/m,
          "// ${MARKER}\\n\\\\1 0"
        )
        if patched == content
          patched = content.gsub(/#  define FMT_USE_CONSTEVAL 1/, '#  define FMT_USE_CONSTEVAL 0')
        end
        if patched != content
          File.chmod(0644, fmt_base)
          File.write(fmt_base, patched)
        end
      end
    end
`;

/**
 * Corrige l'erreur EAS/Xcode 26.4 :
 * "call to consteval function ... FMT_COMPILE_STRING ... is not a constant expression"
 */
const withFmtXcodeFix = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfileContent = fs.readFileSync(podfilePath, "utf8");
      if (podfileContent.includes(MARKER)) {
        return config;
      }

      const updated = podfileContent.replace(
        /(react_native_post_install\([\s\S]*?\)\n)/m,
        `$1${FMT_PATCH}\n`
      );

      if (updated !== podfileContent) {
        fs.writeFileSync(podfilePath, updated);
        console.log("  ✅ Podfile: correctif fmt Xcode 26 appliqué");
      }

      return config;
    },
  ]);
};

module.exports = withFmtXcodeFix;
