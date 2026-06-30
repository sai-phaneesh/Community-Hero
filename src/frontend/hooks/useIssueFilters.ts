import { useState, useMemo } from "react";
import { Issue } from "../../types";

export function useIssueFilters(issues: Issue[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState<"date" | "severity" | "unattended">("date");
  const [showDuplicates, setShowDuplicates] = useState(false);

  const filteredIssues = useMemo(() => {
    return issues.filter((iss) => {
      const matchesSearch =
        iss.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        iss.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        iss.reporterName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = filterCategory === "All" || iss.category === filterCategory;
      const matchesStatus = filterStatus === "All" || iss.status === filterStatus;
      const isDuplicate = !!iss.duplicateOfIssueId;
      const matchesDuplicates = showDuplicates || !isDuplicate;

      return matchesSearch && matchesCategory && matchesStatus && matchesDuplicates;
    });
  }, [issues, searchQuery, filterCategory, filterStatus, showDuplicates]);

  const sortedIssues = useMemo(() => {
    const severityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    
    return [...filteredIssues].sort((a, b) => {
      if (sortBy === "severity") {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      if (sortBy === "unattended") {
        return b.daysUnattended - a.daysUnattended;
      }
      // default: sortBy === "date"
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredIssues, sortBy]);

  return {
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    showDuplicates,
    setShowDuplicates,
    filteredIssues: sortedIssues,
  };
}
