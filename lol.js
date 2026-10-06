const entry = JSON.parse($input.first().json.data);
console.log(entry)

const ielts_types = {
    PARAGRAPH_MATCHING: "Paragraph matching",
    MULTIPLE_CHOICE: "Multiple choice",
    SAMPLE_TEST: "Sample test",
    SHORT_ANSWER: "Short answer",
    SINGLE_CHOICE: "Single choice",
    TRUE_FALSE_NOT_GIVEN: "True, False, Not Given"
}

const body = {
    fields: {
        name: {
            "en-US": $('Get Topic').first().json.topic_name
        },
        "isPremium": { "en-US": $('Get Topic').first().json.is_premium ?? false },
        "complexity": { "en-US": $('Get Topic').first().json.complexity },
        testType: {
            "en-US": ielts_types[$('Get Topic').first().json.question_type] ?? "Sample test"
        },
        sections: {
            "en-US": [
                {
                    sys: {
                        type: "Link",
                        linkType: "Entry",
                        id: entry.sys.id
                    }
                }
            ]
        }
    }
};

return { body: JSON.stringify(body) };