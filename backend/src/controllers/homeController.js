const {
    findAllByUser,
    findById,
    createHome,
    updateHome,
    deleteHome,
  } = require("../models/Home");
  
  const getAll = async (req, res) => {
    try {
      const homes = await findAllByUser(req.user.id);
      res.json(homes);
    } catch (err) {
      res.status(500).json({ detail: "Failed to fetch homes." });
    }
  };
  
  const getOne = async (req, res) => {
    try {
      const home = await findById(req.params.id, req.user.id);
      if (!home) return res.status(404).json({ detail: "Home not found." });
      res.json(home);
    } catch (err) {
      res.status(500).json({ detail: "Failed to fetch home." });
    }
  };
  
  const create = async (req, res) => {
    try {
      const { name, location } = req.body;
      if (!name) return res.status(400).json({ detail: "Name is required." });
      const home = await createHome(name, location, req.user.id);
      res.status(201).json(home);
    } catch (err) {
      res.status(500).json({ detail: "Failed to create home." });
    }
  };
  
  const update = async (req, res) => {
    try {
      const { name, location } = req.body;
      if (!name) return res.status(400).json({ detail: "Name is required." });
      const home = await updateHome(req.params.id, name, location, req.user.id);
      if (!home) return res.status(404).json({ detail: "Home not found." });
      res.json(home);
    } catch (err) {
      res.status(500).json({ detail: "Failed to update home." });
    }
  };
  
  const remove = async (req, res) => {
    try {
      const home = await deleteHome(req.params.id, req.user.id);
      if (!home) return res.status(404).json({ detail: "Home not found." });
      res.json({ message: "Home deleted successfully." });
    } catch (err) {
      res.status(500).json({ detail: "Failed to delete home." });
    }
  };
  
  module.exports = { getAll, getOne, create, update, remove };