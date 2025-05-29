export const debugJobAnalysis = (response, url, status) => {
    console.group("🔍 Job Analysis Debug");
    console.log("📄 Request Details:");
    console.log("  URL:", url);
    console.log("  Status:", status);

    console.log("📋 Raw Response:");
    console.log(response);

    console.log("🔍 Response Analysis:");
    console.log("  Type:", typeof response);
    console.log("  Is Array:", Array.isArray(response));
    console.log("  Has .job property:", !!response?.job);
    console.log("  Has .id property:", !!response?.id);
    console.log("  Keys:", response ? Object.keys(response) : 'No keys');

    if (response?.job) {
        console.log("📝 Job Object Analysis:");
        console.log("  Job ID:", response.job.id);
        console.log("  Job Title:", response.job.title || response.job.metadata?.job_title);
        console.log("  Job Company:", response.job.company || response.job.metadata?.company);
        console.log("  Job Status:", response.job.status);
        console.log("  Job Keys:", Object.keys(response.job));
    }

    if (response?.id && !response?.job) {
        console.log("📝 Direct Job Object Analysis:");
        console.log("  ID:", response.id);
        console.log("  Title:", response.title || response.metadata?.job_title);
        console.log("  Company:", response.company || response.metadata?.company);
        console.log("  Status:", response.status);
        console.log("  Keys:", Object.keys(response));
    }

    console.groupEnd();
};

export const validateJobObject = (job) => {
    const issues = [];

    if (!job) {
        issues.push("Job object is null/undefined");
        return { valid: false, issues };
    }

    if (!job.id) {
        issues.push("Missing job.id");
    }

    if (!job.title && !job.metadata?.job_title) {
        issues.push("Missing job title");
    }

    if (!job.company && !job.metadata?.company) {
        issues.push("Missing company name");
    }

    if (!job.status) {
        issues.push("Missing job status");
    }

    console.log("✅ Job Validation:", {
        valid: issues.length === 0,
        issues,
        job: {
            id: job.id,
            title: job.title || job.metadata?.job_title,
            company: job.company || job.metadata?.company,
            status: job.status
        }
    });

    return {
        valid: issues.length === 0,
        issues,
        job
    };
};

export const logJobListUpdate = (oldJobs, newJobs, action = "unknown") => {
    console.group(`📊 Job List Update - ${action}`);
    console.log("Before:", oldJobs.length, "jobs");
    console.log("After:", newJobs.length, "jobs");
    console.log("Change:", newJobs.length - oldJobs.length);

    if (newJobs.length > oldJobs.length) {
        const addedJobs = newJobs.slice(0, newJobs.length - oldJobs.length);
        console.log("➕ Added jobs:", addedJobs.map(j => ({ id: j.id, title: j.title || j.metadata?.job_title })));
    }

    console.groupEnd();
};

// Enhanced error logging
export const logError = (context, error, additionalData = {}) => {
    console.group(`❌ Error in ${context}`);
    console.error("Error:", error);
    console.log("Message:", error.message);
    console.log("Stack:", error.stack);
    console.log("Additional Data:", additionalData);
    console.groupEnd();
};