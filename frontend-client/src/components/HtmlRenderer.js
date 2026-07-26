import React from 'react';
import { View, Text, Linking } from 'react-native';

/**
 * Parses inline HTML tags (a, b, strong, i, em, u) and auto-detects raw HTTP/HTTPS URLs.
 * Renders interactive links and formatted text.
 */
function parseFormattedText(htmlSnippet, appTheme) {
  if (!htmlSnippet) return null;

  // Clean up <br> tags
  let cleaned = htmlSnippet.replace(/<br\s*\/?>/gi, '\n');

  // Tokenize HTML tags and text content
  const tokens = cleaned.split(/(<[^>]+>)/g);
  const styleStack = [
    {
      fontWeight: '400',
      fontStyle: 'normal',
      textDecorationLine: 'none',
      color: appTheme?.text || '#E0E0E0',
    },
  ];

  const result = tokens
    .map((token, idx) => {
      if (!token) return null;

      const tagMatch = token.match(/^<(\/)?([a-z0-9]+)(?:\s+[^>]*?)?>$/i);
      if (tagMatch) {
        const isClosing = !!tagMatch[1];
        const tagName = tagMatch[2].toLowerCase();

        if (tagName === 'a' && !isClosing) {
          // Robust href extraction for single quotes, double quotes, or unquoted URLs
          const hrefMatch = token.match(/href=["']?([^\s"'>]+)["']?/i);
          const href = hrefMatch ? hrefMatch[1] : null;
          styleStack.push({
            ...styleStack[styleStack.length - 1],
            color: '#3B82F6',
            textDecorationLine: 'underline',
            fontWeight: '600',
            href,
          });
        } else if ((tagName === 'b' || tagName === 'strong') && !isClosing) {
          styleStack.push({
            ...styleStack[styleStack.length - 1],
            fontWeight: '700',
            color: appTheme?.white || '#FFFFFF',
          });
        } else if ((tagName === 'i' || tagName === 'em') && !isClosing) {
          styleStack.push({
            ...styleStack[styleStack.length - 1],
            fontStyle: 'italic',
          });
        } else if (tagName === 'u' && !isClosing) {
          styleStack.push({
            ...styleStack[styleStack.length - 1],
            textDecorationLine: 'underline',
          });
        } else if (isClosing) {
          if (styleStack.length > 1) {
            styleStack.pop();
          }
        }
        return null;
      } else {
        const currentProps = styleStack[styleStack.length - 1] || {};

        // If inside an explicit <a> tag
        if (currentProps.href) {
          const targetUrl = currentProps.href;
          return (
            <Text
              key={idx}
              style={{ ...currentProps }}
              onPress={() => targetUrl && Linking.openURL(targetUrl).catch(() => {})}
            >
              {token}
            </Text>
          );
        }

        // Auto-detect raw HTTP/HTTPS URLs in plain text
        if (/https?:\/\/[^\s<]+/i.test(token)) {
          const parts = token.split(/(https?:\/\/[^\s<]+)/gi);
          return (
            <Text key={idx} style={{ ...currentProps }}>
              {parts.map((part, pIdx) => {
                if (/^https?:\/\//i.test(part)) {
                  return (
                    <Text
                      key={pIdx}
                      style={{
                        color: '#3B82F6',
                        textDecorationLine: 'underline',
                        fontWeight: '600',
                      }}
                      onPress={() => Linking.openURL(part).catch(() => {})}
                    >
                      {part}
                    </Text>
                  );
                }
                return part;
              })}
            </Text>
          );
        }

        return (
          <Text key={idx} style={{ ...currentProps }}>
            {token}
          </Text>
        );
      }
    })
    .filter(Boolean);

  return result.length > 0 ? result : null;
}

export default function HtmlRenderer({ html, appTheme }) {
  if (!html) return null;

  // Replace container <div> tags with line breaks \n
  let cleanHtml = html
    .replace(/<div[^>]*>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  // Match block tags: h1, h2, h3, ul, li, p
  const blockRegex = /<(h1|h2|h3|ul|li|p)[^>]*>(.*?)<\/\1>/gi;
  const blocks = [];
  let lastIndex = 0;
  let match;

  const textStyle = {
    color: appTheme?.text || '#E0E0E0',
    fontSize: 14,
    lineHeight: 22,
  };

  const renderSnippet = (snippet, keyPrefix) => {
    if (!snippet) return null;
    const lines = snippet.split('\n');
    return lines.map((line, idx) => {
      const stripped = line.replace(/<[^>]*>/g, '').trim();
      if (!stripped) return null;
      return (
        <Text key={`${keyPrefix}-${idx}`} style={[textStyle, { marginBottom: 8 }]}>
          {parseFormattedText(line, appTheme)}
        </Text>
      );
    });
  };

  while ((match = blockRegex.exec(cleanHtml)) !== null) {
    if (match.index > lastIndex) {
      const gap = cleanHtml.substring(lastIndex, match.index).trim();
      if (gap) {
        blocks.push(renderSnippet(gap, `gap-${lastIndex}`));
      }
    }

    const tag = match[1].toLowerCase();
    const content = match[2];

    if (tag === 'h1') {
      blocks.push(
        <Text
          key={`h1-${match.index}`}
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: appTheme?.white || '#FFFFFF',
            marginTop: 14,
            marginBottom: 10,
            lineHeight: 28,
          }}
        >
          {parseFormattedText(content, appTheme)}
        </Text>
      );
    } else if (tag === 'h2' || tag === 'h3') {
      blocks.push(
        <Text
          key={`h2-${match.index}`}
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: appTheme?.white || '#FFFFFF',
            marginTop: 12,
            marginBottom: 8,
            lineHeight: 24,
          }}
        >
          {parseFormattedText(content, appTheme)}
        </Text>
      );
    } else if (tag === 'li') {
      blocks.push(
        <View
          key={`li-${match.index}`}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 6,
            paddingLeft: 6,
          }}
        >
          <Text
            style={[
              textStyle,
              { color: appTheme?.primary || '#FF6B35', marginRight: 8, fontSize: 16 },
            ]}
          >
            •
          </Text>
          <Text style={[textStyle, { flex: 1 }]}>
            {parseFormattedText(content, appTheme)}
          </Text>
        </View>
      );
    } else if (tag === 'ul') {
      blocks.push(
        <View key={`ul-${match.index}`} style={{ marginBottom: 10 }}>
          <HtmlRenderer html={content} appTheme={appTheme} />
        </View>
      );
    } else if (tag === 'p') {
      blocks.push(renderSnippet(content, `p-${match.index}`));
    }

    lastIndex = blockRegex.lastIndex;
  }

  if (lastIndex < cleanHtml.length) {
    const tail = cleanHtml.substring(lastIndex).trim();
    if (tail) {
      blocks.push(renderSnippet(tail, `tail-${lastIndex}`));
    }
  }

  return <View style={{ width: '100%' }}>{blocks}</View>;
}
