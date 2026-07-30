/**
 * SAFE JSON PARSER
 * Safely parses JSON with proper error handling and fallbacks
 * Date: 2025-12-29
 */

export function safeJsonParse(jsonString, defaultValue = []) {
    // If it's already an array or object, return it
    if (Array.isArray(jsonString)) {
        return jsonString;
    }
    
    if (typeof jsonString === 'object' && jsonString !== null) {
        return jsonString;
    }
    
    // If it's null or undefined, return default
    if (jsonString === null || jsonString === undefined) {
        return defaultValue;
    }
    
    // If it's not a string, try to convert
    if (typeof jsonString !== 'string') {
        return defaultValue;
    }
    
    // If it's an empty string, return default
    if (jsonString.trim() === '') {
        return defaultValue;
    }
    
    // Try to parse the JSON
    try {
        const parsed = JSON.parse(jsonString);
        return parsed;
    } catch (error) {
        console.warn('⚠️ Failed to parse JSON:', jsonString.substring(0, 50), error.message);
        return defaultValue;
    }
}

export function safeStringify(value) {
    try {
        return JSON.stringify(value);
    } catch (error) {
        console.error('❌ Failed to stringify:', error.message);
        return '[]';
    }
}
