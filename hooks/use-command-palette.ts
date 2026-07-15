"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildCommandContext,
  filterCommands,
  getCommands,
  groupCommands,
  type ResolvedCommand,
} from "@/lib/commands";
import { useCommandPaletteContext } from "@/context/command-palette-context";
import { useEntriesContext } from "@/context/entries-context";
import { useExpenseTemplates } from "@/context/expense-templates-context";
import { useSettings } from "@/context/settings-context";
import { useStaff } from "@/context/staff-context";

export function useCommandPalette() {
  const { isOpen, close } = useCommandPaletteContext();
  const { entries } = useEntriesContext();
  const { staff } = useStaff();
  const { settings } = useSettings();
  const { templates } = useExpenseTemplates();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commandContext = useMemo(
    () =>
      buildCommandContext(
        entries,
        staff,
        settings.branchNames,
        templates
      ),
    [entries, staff, settings.branchNames, templates]
  );

  const commands = useMemo(
    () => getCommands(commandContext),
    [commandContext]
  );

  const filteredCommands = useMemo(
    () => filterCommands(commands, query),
    [commands, query]
  );

  const groupedCommands = useMemo(
    () => groupCommands(filteredCommands),
    [filteredCommands]
  );

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    close();
  }, [close]);

  const executeCommand = useCallback(
    (command: ResolvedCommand) => {
      router.push(command.href);
      close();
    },
    [router, close]
  );

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (filteredCommands.length === 0) return;

      setSelectedIndex((current) => {
        const next = current + direction;
        if (next < 0) return filteredCommands.length - 1;
        if (next >= filteredCommands.length) return 0;
        return next;
      });
    },
    [filteredCommands.length]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveSelection(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveSelection(-1);
          break;
        case "Enter":
          event.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case "Escape":
          event.preventDefault();
          handleClose();
          break;
      }
    },
    [
      moveSelection,
      executeCommand,
      filteredCommands,
      selectedIndex,
      handleClose,
    ]
  );

  const getFlatIndex = useCallback(
    (commandId: string) =>
      filteredCommands.findIndex((command) => command.id === commandId),
    [filteredCommands]
  );

  return {
    isOpen,
    close: handleClose,
    query,
    setQuery: updateQuery,
    filteredCommands,
    groupedCommands,
    selectedIndex,
    setSelectedIndex,
    executeCommand,
    handleKeyDown,
    getFlatIndex,
  };
}
