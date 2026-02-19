# Expanded LLM Curriculum - 20 Lessons

## Current Status
Building comprehensive 20-lesson curriculum covering foundation → advanced AI capabilities

## Structure

### Tier 1: Foundation (Lessons 1-5) ✅ COMPLETE
1. Tokenization - The Language Puzzle
2. Special Tokens - The Secret Signals  
3. Byte Pair Encoding - The Merge Wizard
4. Data Sampling - The Training Dojo
5. Embeddings - The Vector Navigator

### Tier 2: Core Architecture (Lessons 6-10) 🔨 IN PROGRESS
6. **Self-Attention** - The Focus Mechanism
   - How models decide what to pay attention to
   - Query, Key, Value matrices
   - Attention scores and weights
   - Code: Implement basic self-attention

7. **Multi-Head Attention** - Parallel Perspectives
   - Multiple attention patterns simultaneously
   - Head splitting and concatenation
   - Why GPT-4 has 96 attention heads
   - Code: Build multi-head attention layer

8. **Positional Encoding** - Teaching Order
   - How models understand word positions
   - Sinusoidal vs learned positional embeddings
   - Relative vs absolute positions
   - Code: Add positional encoding to embeddings

9. **Transformer Blocks** - The Building Blocks
   - Feed-forward networks
   - Layer normalization
   - Residual connections
   - Code: Assemble a transformer block

10. **Full GPT Architecture** - Putting It All Together
    - Decoder-only architecture
    - Layer stacking
    - Output projection
    - Code: Build a mini-GPT from scratch

### Tier 3: Training & Optimization (Lessons 11-15) 🔨 IN PROGRESS
11. **Pre-training** - Learning from the Internet
    - Next-token prediction objective
    - Training data at scale
    - Loss functions and optimization
    - Code: Pre-train a small model

12. **Fine-tuning** - Task Adaptation
    - Supervised fine-tuning (SFT)
    - Domain adaptation
    - Catastrophic forgetting
    - Code: Fine-tune on custom dataset

13. **RLHF** - Learning from Human Feedback
    - How ChatGPT became helpful
    - Reward models
    - PPO training
    - Code: Simple preference learning

14. **LoRA & PEFT** - Efficient Fine-tuning
    - Low-rank adaptation
    - Parameter-efficient methods
    - QLoRA for 4-bit training
    - Code: Fine-tune with LoRA

15. **Quantization** - Making Models Smaller
    - INT8, INT4, GGUF formats
    - Post-training quantization
    - Quantization-aware training
    - Code: Quantize a model

### Tier 4: Advanced Capabilities (Lessons 16-20) 🔨 IN PROGRESS
16. **Chain of Thought** - Step-by-Step Reasoning
    - Few-shot prompting
    - Self-consistency
    - Tree of thoughts
    - Code: Implement CoT pipeline

17. **Reasoning Models** - o1, R1, DeepSeek-R1
    - Test-time compute scaling
    - Reinforcement learning for reasoning
    - Process vs outcome supervision
    - Code: Simple reasoning loop

18. **RAG** - Retrieval Augmented Generation
    - Vector databases
    - Semantic search
    - Reranking
    - Code: Build RAG system

19. **AI Agents** - Models That Take Action
    - Tool use (function calling)
    - ReAct pattern
    - Agent frameworks
    - Code: Build a simple agent

20. **Multimodal** - Vision + Language
    - CLIP embeddings
    - Vision transformers
    - Image-text models (GPT-4V, Gemini)
    - Code: Multimodal classifier

## Implementation Plan

1. Create lesson content JSON (story, concept, analogy, examples)
2. Write quiz questions for each lesson
3. Create code exercises with starter code
4. Update lesson-content.json with all 20 lessons
5. Test each lesson flow end-to-end

## Time Estimate
- Lessons 6-10: ~15 min
- Lessons 11-15: ~15 min
- Lessons 16-20: ~15 min
- Testing: ~10 min
- **Total: ~55 minutes**

Status: Building now...
