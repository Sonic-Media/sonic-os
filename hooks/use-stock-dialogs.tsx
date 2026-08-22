"use client";

import { useState } from "react";
import { OpeningStockDialog } from "@/components/stock/opening-stock-dialog";
import { StockDeleteDialog } from "@/components/stock/stock-delete-dialog";
import { StockMovementDialog } from "@/components/stock/stock-movement-dialog";
import { StockProductDialog } from "@/components/stock/stock-product-dialog";
import { useStock } from "@/context/stock-context";
import { useStockBranch } from "@/hooks/use-stock-branch";
import type { StockProduct } from "@/types/stock";

export type StockDialogType =
  | "add-product"
  | "edit-product"
  | "delete-product"
  | "opening-stock"
  | "stock-in"
  | "stock-out"
  | null;

interface UseStockDialogsOptions {
  onProductDeleted?: () => void;
}

interface UseStockDialogsResult {
  activeDialog: StockDialogType;
  selectedProduct: StockProduct | null;
  openAddProduct: () => void;
  openEditProduct: (product: StockProduct) => void;
  openDeleteProduct: (product: StockProduct) => void;
  openStockIn: (productId?: string) => void;
  openStockOut: (productId?: string) => void;
  closeDialog: () => void;
  renderDialogs: () => React.ReactNode;
}

export function useStockDialogs(
  options?: UseStockDialogsOptions
): UseStockDialogsResult {
  const { deleteProduct } = useStock();
  const { activeBranch, lastMovementBranch, setLastMovementBranch } =
    useStockBranch();
  const [activeDialog, setActiveDialog] = useState<StockDialogType>(null);
  const [selectedProduct, setSelectedProduct] = useState<StockProduct | null>(
    null
  );
  const [openingStockProduct, setOpeningStockProduct] =
    useState<StockProduct | null>(null);
  const [movementProductId, setMovementProductId] = useState<string | undefined>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  function closeDialog() {
    setActiveDialog(null);
    setSelectedProduct(null);
    setOpeningStockProduct(null);
    setMovementProductId(undefined);
  }

  function openAddProduct() {
    setSelectedProduct(null);
    setOpeningStockProduct(null);
    setActiveDialog("add-product");
  }

  function openEditProduct(product: StockProduct) {
    setSelectedProduct(product);
    setActiveDialog("edit-product");
  }

  function openDeleteProduct(product: StockProduct) {
    setSelectedProduct(product);
    setDeleteError(undefined);
    setActiveDialog("delete-product");
  }

  function openStockIn(productId?: string) {
    setMovementProductId(productId);
    setActiveDialog("stock-in");
  }

  function openStockOut(productId?: string) {
    setMovementProductId(productId);
    setActiveDialog("stock-out");
  }

  function renderDialogs() {
    return (
      <>
        {activeDialog === "add-product" && (
          <StockProductDialog
            key="add-product"
            mode="add"
            onClose={closeDialog}
            onSuccess={(product) => {
              if (!product) {
                closeDialog();
                return;
              }
              setOpeningStockProduct(product);
              setActiveDialog("opening-stock");
            }}
          />
        )}

        {activeDialog === "opening-stock" && openingStockProduct && (
          <OpeningStockDialog
            key={`opening-stock-${openingStockProduct.id}`}
            product={openingStockProduct}
            defaultBranch={activeBranch}
            onClose={closeDialog}
            onComplete={closeDialog}
          />
        )}

        {activeDialog === "edit-product" && selectedProduct && (
          <StockProductDialog
            key={selectedProduct.id}
            mode="edit"
            product={selectedProduct}
            onClose={closeDialog}
          />
        )}

        {activeDialog === "delete-product" && selectedProduct && (
          <StockDeleteDialog
            product={selectedProduct}
            isDeleting={isDeleting}
            errorMessage={deleteError}
            onClose={closeDialog}
            onConfirm={async () => {
              setIsDeleting(true);
              setDeleteError(undefined);

              const result = await deleteProduct(selectedProduct.id);
              setIsDeleting(false);

              if (!result.success) {
                setDeleteError(result.errors.form ?? "Failed to delete item.");
                return;
              }

              closeDialog();
              options?.onProductDeleted?.();
            }}
          />
        )}

        {activeDialog === "stock-in" && (
          <StockMovementDialog
            key={`stock-in-${movementProductId ?? "none"}-${lastMovementBranch}`}
            movementType="in"
            initialProductId={movementProductId}
            defaultBranch={lastMovementBranch || activeBranch}
            onBranchChange={setLastMovementBranch}
            onClose={closeDialog}
          />
        )}

        {activeDialog === "stock-out" && (
          <StockMovementDialog
            key={`stock-out-${movementProductId ?? "none"}-${lastMovementBranch}`}
            movementType="out"
            initialProductId={movementProductId}
            defaultBranch={lastMovementBranch || activeBranch}
            onBranchChange={setLastMovementBranch}
            onClose={closeDialog}
          />
        )}
      </>
    );
  }

  return {
    activeDialog,
    selectedProduct,
    openAddProduct,
    openEditProduct,
    openDeleteProduct,
    openStockIn,
    openStockOut,
    closeDialog,
    renderDialogs,
  };
}
